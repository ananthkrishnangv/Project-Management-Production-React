// DG (Director General) Dashboard Routes
// Read-only analytics access for DG, CSIR

import { Router, Response } from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { currencyService } from '../services/currency.service.js';

const router = Router();

// All routes require authentication as DG, Director, or Admin
router.use(authenticate);

// GET /api/dg-dashboard/overview - Comprehensive overview for DG
router.get('/overview', authorize('DIRECTOR_GENERAL', 'DIRECTOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // Get all counts in parallel
        const [
            totalProjects,
            activeProjects,
            completedProjects,
            pendingProjects,
            totalStaff,
            totalBudget,
            totalExpenses,
            projectsByCategory,
            projectsByStatus,
            recentProjects,
            upcomingMeetings,
            expiringMoUs,
            cashFlowReceived,
            cashFlowUtilized,
        ] = await Promise.all([
            prisma.project.count(),
            prisma.project.count({ where: { status: 'ACTIVE' } }),
            prisma.project.count({ where: { status: 'COMPLETED' } }),
            prisma.project.count({ where: { status: 'PENDING_APPROVAL' } }),
            prisma.user.count({ where: { isActive: true, role: { in: ['EMPLOYEE', 'PROJECT_HEAD', 'SUPERVISOR'] } } }),
            prisma.budget.aggregate({ _sum: { amountINR: true } }),
            prisma.expense.aggregate({ _sum: { amountINR: true } }),
            prisma.project.groupBy({ by: ['category'], _count: { id: true } }),
            prisma.project.groupBy({ by: ['status'], _count: { id: true } }),
            prisma.project.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    projectHead: { select: { firstName: true, lastName: true } },
                    vertical: { select: { name: true, code: true } },
                },
            }),
            prisma.rCMeeting.findMany({
                where: { date: { gte: now }, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
                take: 5,
                orderBy: { date: 'asc' },
            }),
            prisma.moU.count({
                where: {
                    expiryDate: { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
                    isActive: true,
                },
            }),
            prisma.cashFlow.aggregate({
                where: { type: 'RECEIVED' },
                _sum: { amountINR: true },
            }),
            prisma.cashFlow.aggregate({
                where: { type: 'UTILIZED' },
                _sum: { amountINR: true },
            }),
        ]);

        // Calculate financial metrics
        const totalBudgetINR = totalBudget._sum.amountINR || 0;
        const totalExpensesINR = totalExpenses._sum.amountINR || 0;
        const utilizationPercent = totalBudgetINR > 0 ? Math.round((totalExpensesINR / totalBudgetINR) * 100) : 0;
        const remainingINR = totalBudgetINR - totalExpensesINR;

        // Get exchange rate
        const exchangeRate = await currencyService.getExchangeRate('USD', 'INR');

        res.json({
            overview: {
                totalProjects,
                activeProjects,
                completedProjects,
                pendingProjects,
                totalStaff,
                expiringMoUs,
            },
            financial: {
                totalBudgetINR,
                totalBudgetUSD: totalBudgetINR / exchangeRate,
                totalExpensesINR,
                totalExpensesUSD: totalExpensesINR / exchangeRate,
                utilizationPercent,
                remainingINR,
                remainingUSD: remainingINR / exchangeRate,
                exchangeRate,
                cashFlowReceivedINR: cashFlowReceived._sum.amountINR || 0,
                cashFlowUtilizedINR: cashFlowUtilized._sum.amountINR || 0,
            },
            projectsByCategory: projectsByCategory.map(p => ({
                category: p.category,
                count: p._count.id,
            })),
            projectsByStatus: projectsByStatus.map(p => ({
                status: p.status,
                count: p._count.id,
            })),
            recentProjects: recentProjects.map(p => ({
                id: p.id,
                code: p.code,
                title: p.title,
                status: p.status,
                category: p.category,
                projectHead: `${p.projectHead.firstName} ${p.projectHead.lastName}`,
                vertical: p.vertical.name,
            })),
            upcomingMeetings: upcomingMeetings.map(m => ({
                id: m.id,
                title: m.title,
                meetingNumber: m.meetingNumber,
                date: m.date,
                status: m.status,
            })),
        });
    } catch (error) {
        console.error('DG Dashboard overview error:', error);
        res.status(500).json({ error: 'Failed to fetch DG dashboard data' });
    }
});

// GET /api/dg-dashboard/financial-details - Detailed financial breakdown
router.get('/financial-details', authorize('DIRECTOR_GENERAL', 'DIRECTOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { year, month } = req.query;
        const fiscalYear = year as string || `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;

        // Get budgets by category
        const budgetsByCategory = await prisma.budget.groupBy({
            by: ['category'],
            where: { fiscalYear },
            _sum: { amountINR: true, utilized: true },
        });

        // Get fund allocations
        const fundAllocations = await prisma.fundAllocation.findMany({
            where: { fiscalYear },
            orderBy: { allocatedAmount: 'desc' },
        });

        // Get monthly cash flow
        const cashFlows = await prisma.cashFlow.findMany({
            orderBy: { transactionDate: 'desc' },
            take: 100,
        });

        // Group by month
        const monthlyFlow: Record<string, { received: number; utilized: number }> = {};
        cashFlows.forEach(cf => {
            const key = `${cf.transactionDate.getFullYear()}-${String(cf.transactionDate.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyFlow[key]) monthlyFlow[key] = { received: 0, utilized: 0 };
            if (cf.type === 'RECEIVED') monthlyFlow[key].received += cf.amountINR;
            else monthlyFlow[key].utilized += cf.amountINR;
        });

        // Get expenses by category
        const expensesByCategory = await prisma.expense.groupBy({
            by: ['category'],
            _sum: { amountINR: true },
        });

        res.json({
            fiscalYear,
            budgetsByCategory: budgetsByCategory.map(b => ({
                category: b.category,
                allocated: b._sum.amountINR || 0,
                utilized: b._sum.utilized || 0,
                remaining: (b._sum.amountINR || 0) - (b._sum.utilized || 0),
            })),
            fundAllocations: fundAllocations.map(f => ({
                id: f.id,
                category: f.category,
                subcategory: f.subcategory,
                description: f.description,
                allocated: f.allocatedAmount,
                utilized: f.utilizedAmount,
            })),
            monthlyCashFlow: Object.entries(monthlyFlow)
                .map(([month, data]) => ({ month, ...data }))
                .sort((a, b) => b.month.localeCompare(a.month)),
            expensesByCategory: expensesByCategory.map(e => ({
                category: e.category,
                amount: e._sum.amountINR || 0,
            })),
        });
    } catch (error) {
        console.error('Financial details error:', error);
        res.status(500).json({ error: 'Failed to fetch financial details' });
    }
});

// GET /api/dg-dashboard/project-analytics - Project analytics with trends
router.get('/project-analytics', authorize('DIRECTOR_GENERAL', 'DIRECTOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // Projects by vertical
        const projectsByVertical = await prisma.project.groupBy({
            by: ['verticalId'],
            _count: { id: true },
            _sum: { progress: true },
        });

        const verticals = await prisma.vertical.findMany();
        const verticalMap = new Map(verticals.map(v => [v.id, v]));

        // Projects created per month (last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const projectsOverTime = await prisma.project.findMany({
            where: { createdAt: { gte: twelveMonthsAgo } },
            select: { createdAt: true, status: true },
        });

        const monthlyProjects: Record<string, number> = {};
        projectsOverTime.forEach(p => {
            const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
            monthlyProjects[key] = (monthlyProjects[key] || 0) + 1;
        });

        // Get overdue milestones
        const overdueMilestones = await prisma.milestone.count({
            where: {
                status: { in: ['PENDING', 'IN_PROGRESS'] },
                endDate: { lt: new Date() },
            },
        });

        // Average project progress
        const avgProgress = await prisma.project.aggregate({
            where: { status: 'ACTIVE' },
            _avg: { progress: true },
        });

        res.json({
            projectsByVertical: projectsByVertical.map(p => ({
                vertical: verticalMap.get(p.verticalId)?.name || 'Unknown',
                code: verticalMap.get(p.verticalId)?.code || '',
                count: p._count.id,
                avgProgress: p._count.id > 0 ? Math.round((p._sum.progress || 0) / p._count.id) : 0,
            })),
            monthlyProjectCreation: Object.entries(monthlyProjects)
                .map(([month, count]) => ({ month, count }))
                .sort((a, b) => a.month.localeCompare(b.month)),
            overdueMilestones,
            averageProjectProgress: Math.round(avgProgress._avg.progress || 0),
        });
    } catch (error) {
        console.error('Project analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch project analytics' });
    }
});

// GET /api/dg-dashboard/staff-analytics - Staff and manpower analytics
router.get('/staff-analytics', authorize('DIRECTOR_GENERAL', 'DIRECTOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // Staff by role
        const staffByRole = await prisma.user.groupBy({
            by: ['role'],
            where: { isActive: true },
            _count: { id: true },
        });

        // Staff by designation
        const staffByDesignation = await prisma.user.groupBy({
            by: ['designation'],
            where: { isActive: true, designation: { not: null } },
            _count: { id: true },
        });

        // Project staff assignments
        const projectAssignments = await prisma.projectStaff.groupBy({
            by: ['userId'],
            where: { isActive: true },
            _count: { projectId: true },
        });

        // Calculate workload distribution
        const workloadDistribution = {
            noProjects: 0,
            oneProject: 0,
            twoToThree: 0,
            moreThanThree: 0,
        };

        const totalUsers = await prisma.user.count({ where: { isActive: true, role: { in: ['EMPLOYEE', 'PROJECT_HEAD'] } } });
        const usersWithProjects = new Set(projectAssignments.map(p => p.userId));

        workloadDistribution.noProjects = totalUsers - usersWithProjects.size;
        projectAssignments.forEach(p => {
            if (p._count.projectId === 1) workloadDistribution.oneProject++;
            else if (p._count.projectId <= 3) workloadDistribution.twoToThree++;
            else workloadDistribution.moreThanThree++;
        });

        res.json({
            staffByRole: staffByRole.map(s => ({
                role: s.role,
                count: s._count.id,
            })),
            staffByDesignation: staffByDesignation
                .map(s => ({
                    designation: s.designation || 'Not Specified',
                    count: s._count.id,
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 15),
            workloadDistribution,
            totalActiveStaff: totalUsers,
        });
    } catch (error) {
        console.error('Staff analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch staff analytics' });
    }
});

export default router;
