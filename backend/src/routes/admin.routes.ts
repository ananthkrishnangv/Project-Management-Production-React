import { Router, Request, Response } from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/index.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

// ============================================
// VERTICALS
// ============================================

router.get('/verticals', async (req: Request, res: Response) => {
    try {
        const verticals = await prisma.vertical.findMany({
            where: { isActive: true },
            include: {
                _count: { select: { projects: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json(verticals);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch verticals' });
    }
});

router.post('/verticals', authorize('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, code, description } = req.body;

        const vertical = await prisma.vertical.create({
            data: { name, code: code.toUpperCase(), description },
        });

        res.status(201).json(vertical);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create vertical' });
    }
});

router.put('/verticals/:id', authorize('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, code, description, isActive } = req.body;

        const vertical = await prisma.vertical.update({
            where: { id },
            data: { name, code: code?.toUpperCase(), description, isActive },
        });

        res.json(vertical);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update vertical' });
    }
});

// ============================================
// SPECIAL AREAS
// ============================================

router.get('/special-areas', async (req: Request, res: Response) => {
    try {
        const areas = await prisma.specialArea.findMany({
            where: { isActive: true },
            include: {
                _count: { select: { projects: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json(areas);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch special areas' });
    }
});

router.post('/special-areas', authorize('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, description } = req.body;

        const area = await prisma.specialArea.create({
            data: { name, description },
        });

        res.status(201).json(area);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create special area' });
    }
});

// ============================================
// PROJECT CATEGORIES (Static)
// ============================================

router.get('/categories', (req: Request, res: Response) => {
    const categories = [
        { code: 'GAP', name: 'Grant-in-Aid Projects', description: 'Projects funded by government grants' },
        { code: 'CNP', name: 'Consultancy Projects', description: 'Industry consultancy and sponsored research' },
        { code: 'OLP', name: 'Other Lab Projects', description: 'Internal research and other projects' },
    ];
    res.json(categories);
});

// ============================================
// NOTIFICATIONS
// ============================================

router.get('/notifications', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { unreadOnly } = req.query;

        const where: any = { userId: req.user!.userId };
        if (unreadOnly === 'true') where.isRead = false;

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        const unreadCount = await prisma.notification.count({
            where: { userId: req.user!.userId, isRead: false },
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

router.put('/notifications/:id/read', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

router.put('/notifications/read-all', async (req: AuthenticatedRequest, res: Response) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user!.userId },
            data: { isRead: true },
        });

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
});

// ============================================
// AUDIT LOGS
// ============================================

router.get('/audit-logs', authorize('ADMIN', 'DIRECTOR'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { entity, action, userId, startDate, endDate, page = '1', limit = '50' } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        const where: any = {};
        if (entity) where.entity = entity;
        if (action) where.action = action;
        if (userId) where.userId = userId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate as string);
            if (endDate) where.createdAt.lte = new Date(endDate as string);
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { firstName: true, lastName: true, email: true },
                    },
                },
            }),
            prisma.auditLog.count({ where }),
        ]);

        res.json({
            data: logs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// ============================================
// SYSTEM CONFIG
// ============================================

router.get('/config', authorize('ADMIN'), async (req: Request, res: Response) => {
    try {
        const configs = await prisma.systemConfig.findMany();
        res.json(configs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

router.put('/config/:key', authorize('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { key } = req.params;
        const { value, description } = req.body;

        const config = await prisma.systemConfig.upsert({
            where: { key },
            create: { key, value, description },
            update: { value, description },
        });

        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update config' });
    }
});

export default router;
