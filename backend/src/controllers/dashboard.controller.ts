import { Response } from 'express';
import prisma from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { currencyService } from '../services/currency.service.js';

// Get director dashboard
export const getDirectorDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const usdToInr = await currencyService.getExchangeRate('USD', 'INR');

        // Project statistics
        const projectStats = await prisma.project.groupBy({
            by: ['status'],
            _count: { id: true },
        });

        const totalProjects = await prisma.project.count();
        const activeProjects = await prisma.project.count({
            where: { status: 'ACTIVE' },
        });

        // Financial overview
        const budgets = await prisma.budget.aggregate({
            _sum: { amountINR: true },
        });

        const expenses = await prisma.expense.aggregate({
            _sum: { amountINR: true },
        });

        const totalBudget = budgets._sum.amountINR || 0;
        const totalExpenses = expenses._sum.amountINR || 0;

        // Cash flow
        const cashFlowReceived = await prisma.cashFlow.aggregate({
            where: { type: 'RECEIVED' },
            _sum: { amountINR: true },
        });

        const cashFlowUtilized = await prisma.cashFlow.aggregate({
            where: { type: 'UTILIZED' },
            _sum: { amountINR: true },
        });

        // Staff count
        const totalStaff = await prisma.user.count({
            where: {
                isActive: true,
                role: { in: ['PROJECT_HEAD', 'EMPLOYEE', 'SUPERVISOR'] },
            },
        });

        // Upcoming RC meetings
        const upcomingMeetings = await prisma.rCMeeting.findMany({
            where: {
                date: { gte: new Date() },
                status: 'SCHEDULED',
            },
            take: 5,
            orderBy: { date: 'asc' },
        });

        // Pending approvals
        const pendingApprovals = await prisma.project.count({
            where: { status: 'PENDING_APPROVAL' },
        });

        // Projects by category
        const projectsByCategory = await prisma.project.groupBy({
            by: ['category'],
            _count: { id: true },
        });

        // Projects by vertical
        const projectsByVertical = await prisma.project.groupBy({
            by: ['verticalId'],
            _count: { id: true },
        });

        const verticals = await prisma.vertical.findMany();
        const verticalMap = new Map(verticals.map(v => [v.id, v.name]));

        // Overdue milestones
        const overdueMilestones = await prisma.milestone.count({
            where: {
                status: { not: 'COMPLETED' },
                endDate: { lt: new Date() },
            },
        });

        // Expiring MoUs (next 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringMoUs = await prisma.moU.count({
            where: {
                expiryDate: {
                    gte: new Date(),
                    lte: thirtyDaysFromNow,
                },
                isActive: true,
            },
        });

        // Recent outputs
        const recentOutputs = await prisma.projectOutput.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                project: {
                    select: { code: true, title: true },
                },
            },
        });

        res.json({
            exchangeRate: usdToInr,
            kpis: {
                totalProjects,
                activeProjects,
                totalStaff,
                pendingApprovals,
                overdueMilestones,
                expiringMoUs,
            },
            financial: {
                totalBudgetINR: totalBudget,
                totalBudgetUSD: totalBudget / usdToInr,
                totalExpensesINR: totalExpenses,
                totalExpensesUSD: totalExpenses / usdToInr,
                utilizationPercent: totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0,
                remainingINR: totalBudget - totalExpenses,
            },
            cashFlow: {
                receivedINR: cashFlowReceived._sum.amountINR || 0,
                utilizedINR: cashFlowUtilized._sum.amountINR || 0,
                balanceINR: (cashFlowReceived._sum.amountINR || 0) - (cashFlowUtilized._sum.amountINR || 0),
            },
            projectsByStatus: projectStats.map(p => ({
                status: p.status,
                count: p._count.id,
            })),
            projectsByCategory: projectsByCategory.map(p => ({
                category: p.category,
                count: p._count.id,
            })),
            projectsByVertical: projectsByVertical.map(p => ({
                vertical: verticalMap.get(p.verticalId) || 'Unknown',
                count: p._count.id,
            })),
            upcomingMeetings: upcomingMeetings.map(m => ({
                id: m.id,
                title: m.title,
                date: m.date,
                number: m.meetingNumber,
            })),
            recentOutputs,
        });
    } catch (error) {
        console.error('Get director dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
};

// Get supervisor dashboard
export const getSupervisorDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // Projects requiring attention
        const pendingProjects = await prisma.project.findMany({
            where: { status: 'PENDING_APPROVAL' },
            include: {
                vertical: true,
                projectHead: {
                    select: { firstName: true, lastName: true },
                },
            },
            take: 10,
        });

        // Overdue milestones
        const overdueMilestones = await prisma.milestone.findMany({
            where: {
                status: { not: 'COMPLETED' },
                endDate: { lt: new Date() },
            },
            include: {
                project: {
                    select: { code: true, title: true, projectHeadId: true },
                },
            },
            take: 10,
        });

        // Projects by vertical
        const projectsByVertical = await prisma.project.groupBy({
            by: ['verticalId'],
            where: { status: 'ACTIVE' },
            _count: { id: true },
        });

        const verticals = await prisma.vertical.findMany({
            include: {
                _count: {
                    select: { projects: true },
                },
            },
        });

        // Upcoming deadlines
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const upcomingDeadlines = await prisma.milestone.findMany({
            where: {
                status: { not: 'COMPLETED' },
                endDate: {
                    gte: new Date(),
                    lte: sevenDaysFromNow,
                },
            },
            include: {
                project: {
                    select: { code: true, title: true },
                },
            },
            orderBy: { endDate: 'asc' },
            take: 10,
        });

        res.json({
            pendingProjects,
            overdueMilestones,
            upcomingDeadlines,
            verticalStats: verticals.map(v => ({
                id: v.id,
                name: v.name,
                code: v.code,
                projectCount: v._count.projects,
            })),
        });
    } catch (error) {
        console.error('Get supervisor dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
};

// Get project head dashboard
export const getProjectHeadDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;

        // My projects
        const myProjects = await prisma.project.findMany({
            where: { projectHeadId: userId },
            include: {
                vertical: true,
                _count: {
                    select: { staff: true, milestones: true },
                },
                budgets: true,
                expenses: true,
            },
        });

        // Calculate project summaries
        const projectSummaries = myProjects.map(project => {
            const totalBudget = project.budgets.reduce((sum, b) => sum + b.amountINR, 0);
            const totalExpenses = project.expenses.reduce((sum, e) => sum + e.amountINR, 0);

            return {
                id: project.id,
                code: project.code,
                title: project.title,
                status: project.status,
                progress: project.progress,
                vertical: project.vertical?.name,
                teamSize: project._count.staff,
                milestoneCount: project._count.milestones,
                budget: totalBudget,
                expenses: totalExpenses,
                utilization: totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0,
            };
        });

        // My upcoming milestones
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const upcomingMilestones = await prisma.milestone.findMany({
            where: {
                project: { projectHeadId: userId },
                status: { not: 'COMPLETED' },
                endDate: { lte: thirtyDaysFromNow },
            },
            include: {
                project: { select: { code: true } },
            },
            orderBy: { endDate: 'asc' },
        });

        // My team
        const teamMembers = await prisma.projectStaff.findMany({
            where: {
                project: { projectHeadId: userId },
                isActive: true,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        designation: true,
                    },
                },
                project: {
                    select: { code: true },
                },
            },
        });

        res.json({
            projects: projectSummaries,
            upcomingMilestones,
            teamMembers: teamMembers.map(tm => ({
                ...tm.user,
                role: tm.role,
                projectCode: tm.project.code,
            })),
            stats: {
                totalProjects: myProjects.length,
                activeProjects: myProjects.filter(p => p.status === 'ACTIVE').length,
                completedProjects: myProjects.filter(p => p.status === 'COMPLETED').length,
                totalTeamMembers: new Set(teamMembers.map(tm => tm.userId)).size,
            },
        });
    } catch (error) {
        console.error('Get project head dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
};

// Get live statistics (for WebSocket updates)
export const getLiveStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const [
            activeProjects,
            pendingApprovals,
            overdueMilestones,
            todayExpenses,
        ] = await Promise.all([
            prisma.project.count({ where: { status: 'ACTIVE' } }),
            prisma.project.count({ where: { status: 'PENDING_APPROVAL' } }),
            prisma.milestone.count({
                where: {
                    status: { not: 'COMPLETED' },
                    endDate: { lt: new Date() },
                },
            }),
            prisma.expense.aggregate({
                where: {
                    createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                },
                _sum: { amountINR: true },
            }),
        ]);

        res.json({
            activeProjects,
            pendingApprovals,
            overdueMilestones,
            todayExpenses: todayExpenses._sum.amountINR || 0,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Get live stats error:', error);
        res.status(500).json({ error: 'Failed to fetch live statistics' });
    }
};
