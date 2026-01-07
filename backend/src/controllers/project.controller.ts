import { Response } from 'express';
import prisma from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../middleware/audit.middleware.js';
import { generateProjectCode } from '../utils/helpers.js';
import { z } from 'zod';
import { ProjectCategory, ProjectStatus } from '@prisma/client';

// Validation schemas - more flexible to handle custom categories
const createProjectSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    category: z.string().min(2).max(10), // Accept any category code
    verticalId: z.string().uuid(),
    specialAreaId: z.string().uuid().optional(),
    specialArea: z.string().optional(), // Also accept specialArea as string
    projectHeadId: z.string().uuid(),
    startDate: z.string(),
    endDate: z.string(),
    objectives: z.string().optional(),
    methodology: z.string().optional(),
    expectedOutcome: z.string().optional(),
});

const updateProjectSchema = createProjectSchema.partial().extend({
    status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
    progress: z.number().min(0).max(100).optional(),
});


// Get all projects (filtered by role)
export const getProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { user } = req;
        const {
            page = '1',
            limit = '10',
            category,
            status,
            verticalId,
            search,
            projectHeadId
        } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        // Build where clause based on role
        const where: any = {};

        // Role-based access control
        // Full access: ADMIN, SUPERVISOR, DIRECTOR, DIRECTOR_GENERAL
        // Restricted access: PROJECT_HEAD, EMPLOYEE, RC_MEMBER, EXTERNAL_OWNER
        const fullAccessRoles = ['ADMIN', 'SUPERVISOR', 'DIRECTOR', 'DIRECTOR_GENERAL'];

        if (!fullAccessRoles.includes(user?.role || '')) {
            if (user?.role === 'PROJECT_HEAD') {
                // Project heads see projects they head OR are staff on
                where.OR = [
                    { projectHeadId: user.userId },
                    { staff: { some: { userId: user.userId, isActive: true } } },
                ];
            } else if (user?.role === 'EMPLOYEE') {
                // Employees only see projects they are actively assigned to
                where.staff = {
                    some: { userId: user.userId, isActive: true },
                };
            } else if (user?.role === 'RC_MEMBER') {
                // RC Members can see all active/completed projects for review purposes
                where.status = { in: ['ACTIVE', 'COMPLETED', 'PENDING_APPROVAL'] };
            } else if (user?.role === 'EXTERNAL_OWNER') {
                // External owners can only see projects they're linked to
                where.OR = [
                    { projectHeadId: user.userId },
                    { staff: { some: { userId: user.userId } } },
                ];
            } else {
                // Unknown role - no access
                where.id = 'no-access';
            }
        }
        // Full access roles see all projects (no additional filtering)

        // Apply filters
        if (category) where.category = category as ProjectCategory;
        if (status) where.status = status as ProjectStatus;
        if (verticalId) where.verticalId = verticalId;
        if (projectHeadId) where.projectHeadId = projectHeadId;
        if (search) {
            where.OR = [
                { title: { contains: search as string, mode: 'insensitive' } },
                { code: { contains: search as string, mode: 'insensitive' } },
                { description: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                include: {
                    vertical: true,
                    specialArea: true,
                    projectHead: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            designation: true,
                        },
                    },
                    _count: {
                        select: {
                            staff: true,
                            milestones: true,
                            documents: true,
                        },
                    },
                },
            }),
            prisma.project.count({ where }),
        ]);

        res.json({
            data: projects,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

// Get single project
export const getProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                vertical: true,
                specialArea: true,
                projectHead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        designation: true,
                        phone: true,
                    },
                },
                staff: {
                    where: { isActive: true },
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                designation: true,
                            },
                        },
                    },
                },
                milestones: {
                    orderBy: { order: 'asc' },
                },
                budgets: true,
                _count: {
                    select: {
                        expenses: true,
                        documents: true,
                        mous: true,
                        outputs: true,
                    },
                },
            },
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        res.json(project);
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
};

// Create project
export const createProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const data = createProjectSchema.parse(req.body);

        // Get vertical for code generation
        const vertical = await prisma.vertical.findUnique({
            where: { id: data.verticalId },
        });

        if (!vertical) {
            res.status(400).json({ error: 'Invalid vertical' });
            return;
        }

        // Get next sequence number
        const year = new Date().getFullYear();
        const existingProjects = await prisma.project.count({
            where: {
                category: data.category as ProjectCategory,
                verticalId: data.verticalId,
                code: {
                    startsWith: `${data.category}-${year}`,
                },
            },
        });

        const projectCode = generateProjectCode(
            data.category,
            vertical.code,
            existingProjects + 1
        );

        const project = await prisma.project.create({
            data: {
                code: projectCode,
                title: data.title,
                description: data.description,
                category: data.category as ProjectCategory,
                verticalId: data.verticalId,
                specialAreaId: data.specialAreaId,
                projectHeadId: data.projectHeadId,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                objectives: data.objectives,
                methodology: data.methodology,
                expectedOutcome: data.expectedOutcome,
                status: 'DRAFT',
            },
            include: {
                vertical: true,
                projectHead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        await createAuditLog(
            req.user?.userId,
            'CREATE',
            'Project',
            project.id,
            undefined,
            { code: project.code, title: project.title },
            req
        );

        res.status(201).json(project);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};

// Update project
export const updateProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const data = updateProjectSchema.parse(req.body);

        const existingProject = await prisma.project.findUnique({
            where: { id },
        });

        if (!existingProject) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Check permission
        if (
            req.user?.role === 'PROJECT_HEAD' &&
            existingProject.projectHeadId !== req.user.userId
        ) {
            res.status(403).json({ error: 'Not authorized to update this project' });
            return;
        }

        const updateData: any = { ...data };
        if (data.startDate) updateData.startDate = new Date(data.startDate);
        if (data.endDate) updateData.endDate = new Date(data.endDate);

        const project = await prisma.project.update({
            where: { id },
            data: updateData,
            include: {
                vertical: true,
                projectHead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        await createAuditLog(
            req.user?.userId,
            'UPDATE',
            'Project',
            project.id,
            existingProject,
            project,
            req
        );

        res.json(project);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Update project error:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
};

// Delete project
export const deleteProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const project = await prisma.project.findUnique({
            where: { id },
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        await prisma.project.delete({
            where: { id },
        });

        await createAuditLog(
            req.user?.userId,
            'DELETE',
            'Project',
            id,
            { code: project.code, title: project.title },
            undefined,
            req
        );

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
};

// Get project statistics (for RC meetings)
export const getProjectStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                staff: { where: { isActive: true } },
                budgets: true,
                expenses: true,
                outputs: true,
                milestones: true,
            },
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Calculate stats
        const totalBudget = project.budgets.reduce((sum, b) => sum + b.amountINR, 0);
        const totalExpenses = project.expenses.reduce((sum, e) => sum + e.amountINR, 0);
        const budgetUtilization = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;

        const completedMilestones = project.milestones.filter(m => m.status === 'COMPLETED').length;
        const overdueMilestones = project.milestones.filter(m =>
            m.status !== 'COMPLETED' && new Date(m.endDate) < new Date()
        ).length;

        const outputsByType = project.outputs.reduce((acc, o) => {
            acc[o.type] = (acc[o.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        res.json({
            projectCode: project.code,
            projectTitle: project.title,
            status: project.status,
            progress: project.progress,
            staff: {
                total: project.staff.length,
            },
            budget: {
                total: totalBudget,
                utilized: totalExpenses,
                utilizationPercent: budgetUtilization,
                remaining: totalBudget - totalExpenses,
            },
            milestones: {
                total: project.milestones.length,
                completed: completedMilestones,
                overdue: overdueMilestones,
                pending: project.milestones.length - completedMilestones,
            },
            outputs: {
                total: project.outputs.length,
                byType: outputsByType,
            },
            timeline: {
                startDate: project.startDate,
                endDate: project.endDate,
                daysRemaining: Math.max(0, Math.ceil((new Date(project.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
            },
        });
    } catch (error) {
        console.error('Get project stats error:', error);
        res.status(500).json({ error: 'Failed to fetch project statistics' });
    }
};

// Add staff to project
export const addProjectStaff = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { userId, role } = req.body;

        const project = await prisma.project.findUnique({
            where: { id },
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const existingStaff = await prisma.projectStaff.findUnique({
            where: {
                projectId_userId: { projectId: id, userId },
            },
        });

        if (existingStaff) {
            if (existingStaff.isActive) {
                res.status(400).json({ error: 'Staff already assigned to this project' });
                return;
            }
            // Reactivate
            await prisma.projectStaff.update({
                where: { id: existingStaff.id },
                data: { isActive: true, leftAt: null, role },
            });
        } else {
            await prisma.projectStaff.create({
                data: {
                    projectId: id,
                    userId,
                    role,
                },
            });
        }

        res.json({ message: 'Staff added successfully' });
    } catch (error) {
        console.error('Add staff error:', error);
        res.status(500).json({ error: 'Failed to add staff' });
    }
};

// Remove staff from project
export const removeProjectStaff = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id, userId } = req.params;

        await prisma.projectStaff.updateMany({
            where: {
                projectId: id,
                userId,
            },
            data: {
                isActive: false,
                leftAt: new Date(),
            },
        });

        res.json({ message: 'Staff removed successfully' });
    } catch (error) {
        console.error('Remove staff error:', error);
        res.status(500).json({ error: 'Failed to remove staff' });
    }
};

// Bulk add staff to project
export const bulkAddProjectStaff = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { userIds, role = 'MEMBER' } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            res.status(400).json({ error: 'userIds must be a non-empty array' });
            return;
        }

        const project = await prisma.project.findUnique({
            where: { id },
            include: { projectHead: true },
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        let addedCount = 0;
        let skippedCount = 0;

        for (const userId of userIds) {
            try {
                const existingStaff = await prisma.projectStaff.findUnique({
                    where: {
                        projectId_userId: { projectId: id, userId },
                    },
                });

                if (existingStaff) {
                    if (!existingStaff.isActive) {
                        // Reactivate
                        await prisma.projectStaff.update({
                            where: { id: existingStaff.id },
                            data: { isActive: true, leftAt: null, role },
                        });
                        addedCount++;
                    } else {
                        skippedCount++;
                    }
                } else {
                    await prisma.projectStaff.create({
                        data: {
                            projectId: id,
                            userId,
                            role,
                        },
                    });
                    addedCount++;
                }
            } catch (innerError) {
                console.error(`Failed to add staff ${userId}:`, innerError);
                skippedCount++;
            }
        }

        res.json({
            message: `Successfully assigned ${addedCount} staff member(s) to project`,
            added: addedCount,
            skipped: skippedCount,
        });
    } catch (error) {
        console.error('Bulk add staff error:', error);
        res.status(500).json({ error: 'Failed to add staff' });
    }
};

// Add milestone
export const addMilestone = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, description, startDate, endDate, order } = req.body;

        const milestone = await prisma.milestone.create({
            data: {
                projectId: id,
                title,
                description,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                order: order || 0,
            },
        });

        res.status(201).json(milestone);
    } catch (error) {
        console.error('Add milestone error:', error);
        res.status(500).json({ error: 'Failed to add milestone' });
    }
};

// Update milestone
export const updateMilestone = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id, milestoneId } = req.params;
        const { title, description, startDate, endDate, status, progress, order } = req.body;

        const milestone = await prisma.milestone.update({
            where: { id: milestoneId },
            data: {
                title,
                description,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                status,
                progress,
                order,
            },
        });

        res.json(milestone);
    } catch (error) {
        console.error('Update milestone error:', error);
        res.status(500).json({ error: 'Failed to update milestone' });
    }
};
