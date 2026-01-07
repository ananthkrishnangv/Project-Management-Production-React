import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes.js';
import projectRoutes from './project.routes.js';
import financeRoutes from './finance.routes.js';
import rcMeetingRoutes from './rc-meeting.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import documentRoutes from './document.routes.js';
import userRoutes from './user.routes.js';
import adminRoutes from './admin.routes.js';
import settingsRoutes from './settings.routes.js';
import timelineRoutes from './timeline.routes.js';
import dgDashboardRoutes from './dgdashboard.routes.js';
import importRoutes from './import.routes.js';
import staffRoutes from './staff.routes.js';
import reportRoutes from './report.routes.js';
import budgetRoutes from './budget.routes.js';
import prisma from '../config/database.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Verticals endpoint (public read, auth for write)
router.get('/verticals', async (req: Request, res: Response) => {
    try {
        const verticals = await prisma.vertical.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(verticals);
    } catch (error) {
        console.error('Get verticals error:', error);
        res.status(500).json({ error: 'Failed to fetch verticals' });
    }
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/finance', financeRoutes);
router.use('/rc-meetings', rcMeetingRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/documents', documentRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/settings', settingsRoutes);
router.use('/timeline', timelineRoutes);
router.use('/dg-dashboard', dgDashboardRoutes);
router.use('/import', importRoutes);
router.use('/staff', staffRoutes);
router.use('/reports', reportRoutes);
router.use('/budgets', budgetRoutes);

export default router;

