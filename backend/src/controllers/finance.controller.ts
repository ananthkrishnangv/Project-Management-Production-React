import { Response } from 'express';
import prisma from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { currencyService } from '../services/currency.service.js';
import { createAuditLog } from '../middleware/audit.middleware.js';
import { Currency } from '@prisma/client';
import { z } from 'zod';

// Validation schemas
const budgetSchema = z.object({
    fiscalYear: z.string(),
    category: z.string(),
    amountINR: z.number().positive(),
    amountUSD: z.number().positive().optional(),
});

const expenseSchema = z.object({
    description: z.string().min(1),
    category: z.string(),
    amount: z.number().positive(),
    currency: z.enum(['INR', 'USD']).default('INR'),
    vendor: z.string().optional(),
    invoiceNumber: z.string().optional(),
    invoiceDate: z.string().optional(),
});

const cashFlowSchema = z.object({
    type: z.enum(['RECEIVED', 'UTILIZED']),
    source: z.string().optional(),
    description: z.string(),
    amount: z.number().positive(),
    currency: z.enum(['INR', 'USD']).default('INR'),
    transactionDate: z.string(),
});

// Get financial dashboard (director)
export const getFinanceDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // Get current exchange rate
        const usdToInr = await currencyService.getExchangeRate('USD', 'INR');

        // Get all projects with financial data
        const projects = await prisma.project.findMany({
            where: { status: { in: ['ACTIVE', 'ON_HOLD'] } },
            include: {
                budgets: true,
                expenses: true,
                cashFlows: true,
            },
        });

        // Calculate totals
        let totalBudgetINR = 0;
        let totalExpensesINR = 0;
        let totalReceivedINR = 0;
        let totalUtilizedINR = 0;

        const projectFinancials = projects.map(project => {
            const budget = project.budgets.reduce((sum, b) => sum + b.amountINR, 0);
            const expenses = project.expenses.reduce((sum, e) => sum + e.amountINR, 0);
            const received = project.cashFlows
                .filter(cf => cf.type === 'RECEIVED')
                .reduce((sum, cf) => sum + cf.amountINR, 0);
            const utilized = project.cashFlows
                .filter(cf => cf.type === 'UTILIZED')
                .reduce((sum, cf) => sum + cf.amountINR, 0);

            totalBudgetINR += budget;
            totalExpensesINR += expenses;
            totalReceivedINR += received;
            totalUtilizedINR += utilized;

            return {
                projectId: project.id,
                projectCode: project.code,
                projectTitle: project.title,
                budget,
                expenses,
                utilization: budget > 0 ? Math.round((expenses / budget) * 100) : 0,
            };
        });

        // Budget by category
        const budgetByCategory = await prisma.budget.groupBy({
            by: ['category'],
            _sum: { amountINR: true },
        });

        // Monthly expenses trend (last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const monthlyExpenses = await prisma.expense.groupBy({
            by: ['createdAt'],
            _sum: { amountINR: true },
            where: {
                createdAt: { gte: twelveMonthsAgo },
            },
            orderBy: { createdAt: 'asc' },
        });

        res.json({
            exchangeRate: {
                usdToInr,
                lastUpdated: new Date().toISOString(),
            },
            summary: {
                totalBudgetINR,
                totalBudgetUSD: totalBudgetINR / usdToInr,
                totalExpensesINR,
                totalExpensesUSD: totalExpensesINR / usdToInr,
                overallUtilization: totalBudgetINR > 0
                    ? Math.round((totalExpensesINR / totalBudgetINR) * 100)
                    : 0,
                remainingBudgetINR: totalBudgetINR - totalExpensesINR,
            },
            cashFlow: {
                totalReceivedINR,
                totalReceivedUSD: totalReceivedINR / usdToInr,
                totalUtilizedINR,
                totalUtilizedUSD: totalUtilizedINR / usdToInr,
                balance: totalReceivedINR - totalUtilizedINR,
            },
            projectFinancials,
            budgetByCategory: budgetByCategory.map(b => ({
                category: b.category,
                amount: b._sum.amountINR || 0,
            })),
            monthlyExpenses: monthlyExpenses.map(m => ({
                month: m.createdAt,
                amount: m._sum.amountINR || 0,
            })),
        });
    } catch (error) {
        console.error('Get finance dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch financial dashboard' });
    }
};

// Get project budget
export const getProjectBudget = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;

        const budgets = await prisma.budget.findMany({
            where: { projectId },
            orderBy: [{ fiscalYear: 'desc' }, { category: 'asc' }],
        });

        const expenses = await prisma.expense.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
        });

        const totalBudget = budgets.reduce((sum, b) => sum + b.amountINR, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amountINR, 0);

        res.json({
            budgets,
            expenses,
            summary: {
                totalBudget,
                totalExpenses,
                utilization: totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0,
                remaining: totalBudget - totalExpenses,
            },
        });
    } catch (error) {
        console.error('Get project budget error:', error);
        res.status(500).json({ error: 'Failed to fetch project budget' });
    }
};

// Create/update budget
export const upsertBudget = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;
        const data = budgetSchema.parse(req.body);

        // Get exchange rate if USD not provided
        let amountUSD = data.amountUSD;
        let exchangeRate: number | undefined;

        if (!amountUSD) {
            const rate = await currencyService.getExchangeRate('INR', 'USD');
            amountUSD = data.amountINR * rate;
            exchangeRate = 1 / rate;
        }

        const existingBudget = await prisma.budget.findFirst({
            where: {
                projectId,
                fiscalYear: data.fiscalYear,
                category: data.category,
            },
        });

        let budget;
        if (existingBudget) {
            budget = await prisma.budget.update({
                where: { id: existingBudget.id },
                data: {
                    amountINR: data.amountINR,
                    amountUSD,
                    exchangeRate,
                },
            });
        } else {
            budget = await prisma.budget.create({
                data: {
                    projectId,
                    fiscalYear: data.fiscalYear,
                    category: data.category,
                    amountINR: data.amountINR,
                    amountUSD,
                    exchangeRate,
                },
            });
        }

        await createAuditLog(
            req.user?.userId,
            existingBudget ? 'UPDATE' : 'CREATE',
            'Budget',
            budget.id,
            existingBudget || undefined,
            budget,
            req
        );

        res.json(budget);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Upsert budget error:', error);
        res.status(500).json({ error: 'Failed to save budget' });
    }
};

// Add expense
export const addExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;
        const data = expenseSchema.parse(req.body);

        // Convert to INR if needed
        const { amountINR, rate } = await currencyService.convertToINR(
            data.amount,
            data.currency as Currency
        );

        const expense = await prisma.expense.create({
            data: {
                projectId,
                description: data.description,
                category: data.category,
                amount: data.amount,
                currency: data.currency as Currency,
                amountINR,
                exchangeRate: data.currency === 'USD' ? rate : undefined,
                vendor: data.vendor,
                invoiceNumber: data.invoiceNumber,
                invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
            },
        });

        // Update budget utilization
        const budget = await prisma.budget.findFirst({
            where: { projectId, category: data.category },
        });

        if (budget) {
            await prisma.budget.update({
                where: { id: budget.id },
                data: {
                    utilized: { increment: amountINR },
                },
            });
        }

        await createAuditLog(req.user?.userId, 'CREATE', 'Expense', expense.id, undefined, expense, req);

        res.status(201).json(expense);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Add expense error:', error);
        res.status(500).json({ error: 'Failed to add expense' });
    }
};

// Get current exchange rate
export const getExchangeRate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const usdToInr = await currencyService.getExchangeRate('USD', 'INR');

        res.json({
            base: 'USD',
            target: 'INR',
            rate: usdToInr,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Get exchange rate error:', error);
        res.status(500).json({ error: 'Failed to fetch exchange rate' });
    }
};

// Convert currency
export const convertCurrency = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { amount, from, to } = req.body;

        if (!amount || !from || !to) {
            res.status(400).json({ error: 'Amount, from, and to currencies required' });
            return;
        }

        let result: number;
        let rate: number;

        if (from === 'USD' && to === 'INR') {
            rate = await currencyService.getExchangeRate('USD', 'INR');
            result = amount * rate;
        } else if (from === 'INR' && to === 'USD') {
            rate = await currencyService.getExchangeRate('INR', 'USD');
            result = amount * rate;
        } else {
            res.status(400).json({ error: 'Only USD/INR conversion supported' });
            return;
        }

        res.json({
            input: { amount, currency: from },
            output: { amount: result, currency: to },
            rate,
            convertedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Convert currency error:', error);
        res.status(500).json({ error: 'Failed to convert currency' });
    }
};

// Get cash flow
export const getCashFlow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { projectId } = req.query;

        const where: any = {};
        if (projectId) where.projectId = projectId;

        const cashFlows = await prisma.cashFlow.findMany({
            where,
            include: {
                project: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                    },
                },
            },
            orderBy: { transactionDate: 'desc' },
        });

        const received = cashFlows
            .filter(cf => cf.type === 'RECEIVED')
            .reduce((sum, cf) => sum + cf.amountINR, 0);

        const utilized = cashFlows
            .filter(cf => cf.type === 'UTILIZED')
            .reduce((sum, cf) => sum + cf.amountINR, 0);

        res.json({
            transactions: cashFlows,
            summary: {
                totalReceived: received,
                totalUtilized: utilized,
                balance: received - utilized,
            },
        });
    } catch (error) {
        console.error('Get cash flow error:', error);
        res.status(500).json({ error: 'Failed to fetch cash flow' });
    }
};

// Add cash flow entry
export const addCashFlow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;
        const data = cashFlowSchema.parse(req.body);

        const { amountINR, rate } = await currencyService.convertToINR(
            data.amount,
            data.currency as Currency
        );

        const cashFlow = await prisma.cashFlow.create({
            data: {
                projectId,
                type: data.type,
                source: data.source,
                description: data.description,
                amount: data.amount,
                currency: data.currency as Currency,
                amountINR,
                exchangeRate: data.currency === 'USD' ? rate : undefined,
                transactionDate: new Date(data.transactionDate),
            },
        });

        await createAuditLog(req.user?.userId, 'CREATE', 'CashFlow', cashFlow.id, undefined, cashFlow, req);

        res.status(201).json(cashFlow);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Add cash flow error:', error);
        res.status(500).json({ error: 'Failed to add cash flow' });
    }
};

// Get costing summary for reports
export const getCostingSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { startDate, endDate, projectId } = req.query;

        const where: any = {};
        if (projectId) where.projectId = projectId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate as string);
            if (endDate) where.createdAt.lte = new Date(endDate as string);
        }

        const usdToInr = await currencyService.getExchangeRate('USD', 'INR');

        const expenses = await prisma.expense.findMany({
            where,
            include: {
                project: {
                    select: { code: true, title: true },
                },
            },
        });

        // Group by category
        const byCategory = expenses.reduce((acc, exp) => {
            if (!acc[exp.category]) {
                acc[exp.category] = { inr: 0, usd: 0 };
            }
            acc[exp.category].inr += exp.amountINR;
            acc[exp.category].usd += exp.amountINR / usdToInr;
            return acc;
        }, {} as Record<string, { inr: number; usd: number }>);

        // Group by project
        const byProject = expenses.reduce((acc, exp) => {
            const key = exp.project?.code || 'Unknown';
            if (!acc[key]) {
                acc[key] = { title: exp.project?.title || 'Unknown', inr: 0, usd: 0 };
            }
            acc[key].inr += exp.amountINR;
            acc[key].usd += exp.amountINR / usdToInr;
            return acc;
        }, {} as Record<string, { title: string; inr: number; usd: number }>);

        const totalINR = expenses.reduce((sum, e) => sum + e.amountINR, 0);

        res.json({
            period: {
                start: startDate || 'All time',
                end: endDate || 'Present',
            },
            exchangeRate: usdToInr,
            total: {
                inr: totalINR,
                usd: totalINR / usdToInr,
            },
            byCategory: Object.entries(byCategory).map(([category, amounts]) => ({
                category,
                ...amounts,
            })),
            byProject: Object.entries(byProject).map(([code, data]) => ({
                code,
                ...data,
            })),
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Get costing summary error:', error);
        res.status(500).json({ error: 'Failed to generate costing summary' });
    }
};
