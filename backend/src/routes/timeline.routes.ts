import { Router, Request, Response } from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/index.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';
import { MilestoneStatus } from '@prisma/client';

const router = Router();

router.use(authenticate);

// ============================================
// MILESTONES
// ============================================

// Get all milestones with filtering
router.get('/milestones', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId, status, category, startDate, endDate } = req.query;

        const where: any = {};
        if (projectId) where.projectId = projectId;
        if (status) where.status = status;
        if (startDate || endDate) {
            where.endDate = {};
            if (startDate) where.endDate.gte = new Date(startDate as string);
            if (endDate) where.endDate.lte = new Date(endDate as string);
        }

        // Check user role for filtering
        const user = await prisma.user.findUnique({
            where: { id: req.user?.userId },
            select: { role: true },
        });

        // Non-admin users can only see their own project milestones
        if (user?.role === 'EMPLOYEE' || user?.role === 'PROJECT_HEAD') {
            const userProjects = await prisma.projectStaff.findMany({
                where: { userId: req.user?.userId, isActive: true },
                select: { projectId: true },
            });
            const headedProjects = await prisma.project.findMany({
                where: { projectHeadId: req.user?.userId },
                select: { id: true },
            });
            const projectIds = [
                ...userProjects.map((p) => p.projectId),
                ...headedProjects.map((p) => p.id),
            ];
            where.projectId = { in: projectIds };
        }

        const milestones = await prisma.milestone.findMany({
            where,
            include: {
                project: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        category: true,
                        status: true,
                    },
                },
            },
            orderBy: [{ project: { code: 'asc' } }, { startDate: 'asc' }],
        });

        // Group by project for Gantt chart view
        const groupedByProject = milestones.reduce((acc: any, milestone) => {
            const projectKey = milestone.project.code;
            if (!acc[projectKey]) {
                acc[projectKey] = {
                    project: milestone.project,
                    milestones: [],
                };
            }
            acc[projectKey].milestones.push(milestone);
            return acc;
        }, {});

        res.json({
            milestones,
            grouped: Object.values(groupedByProject),
            total: milestones.length,
        });
    } catch (error) {
        console.error('Get milestones error:', error);
        res.status(500).json({ error: 'Failed to fetch milestones' });
    }
});

// Get milestones for a specific project
router.get('/projects/:projectId/milestones', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;

        const milestones = await prisma.milestone.findMany({
            where: { projectId },
            orderBy: { order: 'asc' },
        });

        res.json(milestones);
    } catch (error) {
        console.error('Get project milestones error:', error);
        res.status(500).json({ error: 'Failed to fetch project milestones' });
    }
});

// Create milestone
const milestoneSchema = z.object({
    projectId: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    startDate: z.string().datetime().or(z.date()),
    endDate: z.string().datetime().or(z.date()),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']).default('PENDING'),
    progress: z.number().min(0).max(100).default(0),
    order: z.number().int().optional(),
});

router.post('/milestones', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const data = milestoneSchema.parse(req.body);

        // Verify project exists
        const project = await prisma.project.findUnique({
            where: { id: data.projectId },
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Check user has access to this project
        const user = await prisma.user.findUnique({
            where: { id: req.user?.userId },
            select: { role: true },
        });

        if (user?.role === 'PROJECT_HEAD' && project.projectHeadId !== req.user?.userId) {
            res.status(403).json({ error: 'Not authorized to add milestones to this project' });
            return;
        }

        // Get next order number if not provided
        if (!data.order) {
            const lastMilestone = await prisma.milestone.findFirst({
                where: { projectId: data.projectId },
                orderBy: { order: 'desc' },
            });
            data.order = (lastMilestone?.order || 0) + 1;
        }

        const milestone = await prisma.milestone.create({
            data: {
                ...data,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
            },
        });

        // Update project progress based on milestones
        await updateProjectProgress(data.projectId);

        await prisma.auditLog.create({
            data: {
                userId: req.user?.userId,
                action: 'CREATE',
                entity: 'Milestone',
                entityId: milestone.id,
                newValue: data,
            },
        });

        res.status(201).json(milestone);
    } catch (error) {
        console.error('Create milestone error:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid milestone data', details: error.errors });
            return;
        }
        res.status(500).json({ error: 'Failed to create milestone' });
    }
});

// Update milestone
router.put('/milestones/:id', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, startDate, endDate, status, progress, order } = req.body;

        const existing = await prisma.milestone.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!existing) {
            res.status(404).json({ error: 'Milestone not found' });
            return;
        }

        // Check authorization
        const user = await prisma.user.findUnique({
            where: { id: req.user?.userId },
            select: { role: true },
        });

        if (user?.role === 'PROJECT_HEAD' && existing.project.projectHeadId !== req.user?.userId) {
            res.status(403).json({ error: 'Not authorized to update this milestone' });
            return;
        }

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (startDate !== undefined) updateData.startDate = new Date(startDate);
        if (endDate !== undefined) updateData.endDate = new Date(endDate);
        if (status !== undefined) updateData.status = status;
        if (progress !== undefined) updateData.progress = progress;
        if (order !== undefined) updateData.order = order;

        const milestone = await prisma.milestone.update({
            where: { id },
            data: updateData,
        });

        // Update project progress
        await updateProjectProgress(existing.projectId);

        await prisma.auditLog.create({
            data: {
                userId: req.user?.userId,
                action: 'UPDATE',
                entity: 'Milestone',
                entityId: id,
                oldValue: existing,
                newValue: milestone,
            },
        });

        res.json(milestone);
    } catch (error) {
        console.error('Update milestone error:', error);
        res.status(500).json({ error: 'Failed to update milestone' });
    }
});

// Delete milestone
router.delete('/milestones/:id', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const existing = await prisma.milestone.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!existing) {
            res.status(404).json({ error: 'Milestone not found' });
            return;
        }

        // Check authorization
        const user = await prisma.user.findUnique({
            where: { id: req.user?.userId },
            select: { role: true },
        });

        if (user?.role === 'PROJECT_HEAD' && existing.project.projectHeadId !== req.user?.userId) {
            res.status(403).json({ error: 'Not authorized to delete this milestone' });
            return;
        }

        await prisma.milestone.delete({ where: { id } });

        // Update project progress
        await updateProjectProgress(existing.projectId);

        await prisma.auditLog.create({
            data: {
                userId: req.user?.userId,
                action: 'DELETE',
                entity: 'Milestone',
                entityId: id,
            },
        });

        res.json({ message: 'Milestone deleted successfully' });
    } catch (error) {
        console.error('Delete milestone error:', error);
        res.status(500).json({ error: 'Failed to delete milestone' });
    }
});

// ============================================
// TIMELINE OVERVIEW
// ============================================

// Get timeline overview for dashboard
router.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Upcoming deadlines
        const upcomingDeadlines = await prisma.milestone.findMany({
            where: {
                endDate: {
                    gte: now,
                    lte: thirtyDaysFromNow,
                },
                status: { not: 'COMPLETED' },
            },
            include: {
                project: {
                    select: { code: true, title: true },
                },
            },
            orderBy: { endDate: 'asc' },
            take: 10,
        });

        // Overdue milestones
        const overdueMilestones = await prisma.milestone.findMany({
            where: {
                endDate: { lt: now },
                status: { not: 'COMPLETED' },
            },
            include: {
                project: {
                    select: { code: true, title: true },
                },
            },
            orderBy: { endDate: 'asc' },
        });

        // Statistics
        const stats = await prisma.milestone.groupBy({
            by: ['status'],
            _count: { id: true },
        });

        const statusCounts = stats.reduce((acc: any, s) => {
            acc[s.status] = s._count.id;
            return acc;
        }, {});

        // Project progress summary
        const projects = await prisma.project.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                code: true,
                title: true,
                progress: true,
                endDate: true,
            },
            orderBy: { progress: 'asc' },
            take: 10,
        });

        res.json({
            upcomingDeadlines,
            overdueMilestones,
            statusCounts: {
                pending: statusCounts.PENDING || 0,
                inProgress: statusCounts.IN_PROGRESS || 0,
                completed: statusCounts.COMPLETED || 0,
                overdue: statusCounts.OVERDUE || 0,
            },
            lowProgressProjects: projects.filter((p) => p.progress < 50),
        });
    } catch (error) {
        console.error('Get timeline overview error:', error);
        res.status(500).json({ error: 'Failed to fetch timeline overview' });
    }
});

// Helper function to update project progress based on milestones
async function updateProjectProgress(projectId: string) {
    const milestones = await prisma.milestone.findMany({
        where: { projectId },
    });

    if (milestones.length === 0) return;

    const totalProgress = milestones.reduce((sum, m) => sum + m.progress, 0);
    const averageProgress = Math.round(totalProgress / milestones.length);

    await prisma.project.update({
        where: { id: projectId },
        data: { progress: averageProgress },
    });

    // Check for overdue milestones
    const now = new Date();
    const overdueIds = milestones
        .filter((m) => m.endDate < now && m.status !== 'COMPLETED' && m.status !== 'OVERDUE')
        .map((m) => m.id);

    if (overdueIds.length > 0) {
        await prisma.milestone.updateMany({
            where: { id: { in: overdueIds } },
            data: { status: 'OVERDUE' },
        });
    }
}

export default router;
