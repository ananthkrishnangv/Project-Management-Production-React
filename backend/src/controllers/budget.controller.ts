// Budget Management Controller
// Handles budget requests, transfers, allocations, and archival

import { Response } from 'express';
import prisma from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../middleware/audit.middleware.js';
import { z } from 'zod';
import nodemailer from 'nodemailer';

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER || 'ictserc@gmail.com',
        pass: process.env.SMTP_PASS || 'yyhoakynckydyybm'
    }
});

// Validation schemas
const budgetRequestSchema = z.object({
    category: z.enum(['MANPOWER', 'EQUIPMENT', 'TRAVEL', 'CONSUMABLES', 'OVERHEAD', 'CONTINGENCY', 'OTHER']),
    amount: z.number().positive(),
    justification: z.string().min(10)
});

const budgetTransferSchema = z.object({
    fromProjectId: z.string().uuid().optional(),
    toProjectId: z.string().uuid().optional(),
    fromCategory: z.enum(['MANPOWER', 'EQUIPMENT', 'TRAVEL', 'CONSUMABLES', 'OVERHEAD', 'CONTINGENCY', 'OTHER']).optional(),
    toCategory: z.enum(['MANPOWER', 'EQUIPMENT', 'TRAVEL', 'CONSUMABLES', 'OVERHEAD', 'CONTINGENCY', 'OTHER']).optional(),
    amount: z.number().positive(),
    reason: z.string().min(5)
});

const budgetAllocationSchema = z.object({
    projectId: z.string().uuid(),
    category: z.enum(['MANPOWER', 'EQUIPMENT', 'TRAVEL', 'CONSUMABLES', 'OVERHEAD', 'CONTINGENCY', 'OTHER']),
    amount: z.number().positive(),
    fiscalYear: z.string().regex(/^\d{4}-\d{2}$/, 'Fiscal year must be in format YYYY-YY (e.g., 2024-25)')
});

// Permission checks
const canManageBudget = (role: string): boolean => {
    return ['ADMIN', 'SUPERVISOR'].includes(role);
};

const canRequestBudget = async (userId: string, projectId: string): Promise<boolean> => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { staff: { where: { userId, isActive: true } } }
    });
    if (!project) return false;
    return project.projectHeadId === userId || project.staff.length > 0;
};

// Get current fiscal year
const getCurrentFiscalYear = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    // Fiscal year starts April 1
    if (month >= 4) {
        return `${year}-${(year + 1).toString().slice(2)}`;
    }
    return `${year - 1}-${year.toString().slice(2)}`;
};

export const budgetController = {
    // Request budget (project members)
    async requestBudget(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { projectId } = req.params;
            const userId = req.user!.userId;

            const canRequest = await canRequestBudget(userId, projectId);
            if (!canRequest) {
                res.status(403).json({ error: 'You are not authorized to request budget for this project' });
                return;
            }

            const validation = budgetRequestSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({ error: validation.error.errors });
                return;
            }

            const { category, amount, justification } = validation.data;

            const project = await prisma.project.findUnique({
                where: { id: projectId },
                select: { code: true, title: true }
            });

            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            const request = await prisma.budgetRequest.create({
                data: {
                    projectId,
                    requestedById: userId,
                    category: category as any,
                    amount,
                    justification,
                    status: 'PENDING'
                }
            });

            // Notify BKMD Head
            const supervisors = await prisma.user.findMany({
                where: { role: 'SUPERVISOR', isActive: true }
            });

            for (const supervisor of supervisors) {
                await prisma.notification.create({
                    data: {
                        userId: supervisor.id,
                        type: 'BUDGET_REQUEST',
                        title: 'Budget Request - Approval Required',
                        message: `Budget request of ₹${amount.toLocaleString('en-IN')} for ${category} in project ${project.code}`,
                        link: `/finance/requests/${request.id}`,
                        isRead: false
                    }
                });
            }

            await createAuditLog(userId, 'CREATE', 'BudgetRequest', request.id, undefined, {
                projectCode: project.code,
                category,
                amount
            }, req);

            res.status(201).json(request);
        } catch (error) {
            console.error('Budget request error:', error);
            res.status(500).json({ error: 'Failed to submit budget request' });
        }
    },

    // Approve/Reject budget request (BKMD Head)
    async approveBudgetRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!canManageBudget(req.user!.role)) {
                res.status(403).json({ error: 'Permission denied' });
                return;
            }

            const { requestId } = req.params;
            const { action, approvedAmount, comments } = req.body;

            if (!['APPROVED', 'REJECTED', 'PARTIALLY_APPROVED'].includes(action)) {
                res.status(400).json({ error: 'Invalid action' });
                return;
            }

            const request = await prisma.budgetRequest.findUnique({
                where: { id: requestId },
                include: {
                    project: { select: { code: true, title: true } },
                    requestedBy: { select: { firstName: true, lastName: true, email: true } }
                }
            });

            if (!request) {
                res.status(404).json({ error: 'Request not found' });
                return;
            }

            const updatedRequest = await prisma.budgetRequest.update({
                where: { id: requestId },
                data: {
                    status: action,
                    approvedById: req.user!.userId,
                    approvedAmount: action === 'PARTIALLY_APPROVED' ? approvedAmount : (action === 'APPROVED' ? request.amount : null),
                    approvedAt: new Date(),
                    comments
                }
            });

            // If approved, update budget allocation
            if (action === 'APPROVED' || action === 'PARTIALLY_APPROVED') {
                const finalAmount = action === 'PARTIALLY_APPROVED' ? approvedAmount : request.amount;
                const fiscalYear = getCurrentFiscalYear();

                // Update or create budget entry
                const existingBudget = await prisma.budget.findFirst({
                    where: {
                        projectId: request.projectId,
                        category: request.category,
                        fiscalYear
                    }
                });

                if (existingBudget) {
                    await prisma.budget.update({
                        where: { id: existingBudget.id },
                        data: { amountINR: existingBudget.amountINR + finalAmount }
                    });
                } else {
                    await prisma.budget.create({
                        data: {
                            projectId: request.projectId,
                            category: request.category,
                            fiscalYear,
                            amountINR: finalAmount
                        }
                    });
                }
            }

            // Notify requester
            await prisma.notification.create({
                data: {
                    userId: request.requestedById,
                    type: 'BUDGET_REQUEST',
                    title: `Budget Request ${action}`,
                    message: `Your budget request for ${request.project.code} has been ${action.toLowerCase()}.${comments ? ' Comments: ' + comments : ''}`,
                    link: `/projects/${request.projectId}`,
                    isRead: false
                }
            });

            // Send email
            await transporter.sendMail({
                from: '"CSIR-SERC PMS" <ictserc@gmail.com>',
                to: request.requestedBy.email,
                subject: `Budget Request ${action}: ${request.project.code}`,
                html: `
                    <h2>Budget Request ${action}</h2>
                    <p>Dear ${request.requestedBy.firstName},</p>
                    <p>Your budget request has been processed:</p>
                    <table style="border-collapse: collapse; margin: 16px 0;">
                        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Project:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${request.project.code}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Category:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${request.category}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Requested:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">₹${request.amount.toLocaleString('en-IN')}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Status:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${action}</td></tr>
                        ${approvedAmount ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Approved Amount:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">₹${approvedAmount.toLocaleString('en-IN')}</td></tr>` : ''}
                    </table>
                    ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ''}
                `
            }).catch((err: Error) => console.error('Email error:', err));

            res.json(updatedRequest);
        } catch (error) {
            console.error('Approve budget error:', error);
            res.status(500).json({ error: 'Failed to process budget request' });
        }
    },

    // Transfer budget between projects/categories
    async transferBudget(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!canManageBudget(req.user!.role)) {
                res.status(403).json({ error: 'Permission denied' });
                return;
            }

            const validation = budgetTransferSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({ error: validation.error.errors });
                return;
            }

            const { fromProjectId, toProjectId, fromCategory, toCategory, amount, reason } = validation.data;
            const fiscalYear = getCurrentFiscalYear();

            // Validate at least one source and destination
            if (!fromProjectId && !fromCategory) {
                res.status(400).json({ error: 'Either fromProjectId or fromCategory must be specified' });
                return;
            }
            if (!toProjectId && !toCategory) {
                res.status(400).json({ error: 'Either toProjectId or toCategory must be specified' });
                return;
            }

            // Create transfer record
            const transfer = await prisma.budgetTransfer.create({
                data: {
                    fromProjectId,
                    toProjectId,
                    fromCategory: fromCategory as any,
                    toCategory: toCategory as any,
                    amount,
                    amountINR: amount, // Assuming INR
                    reason,
                    transferredById: req.user!.userId,
                    fiscalYear
                }
            });

            // Update source budget (decrease)
            if (fromProjectId && fromCategory) {
                await prisma.budget.updateMany({
                    where: { projectId: fromProjectId, category: fromCategory, fiscalYear },
                    data: { amountINR: { decrement: amount } }
                });
            }

            // Update destination budget (increase)
            if (toProjectId && toCategory) {
                const existingBudget = await prisma.budget.findFirst({
                    where: { projectId: toProjectId, category: toCategory, fiscalYear }
                });

                if (existingBudget) {
                    await prisma.budget.update({
                        where: { id: existingBudget.id },
                        data: { amountINR: { increment: amount } }
                    });
                } else {
                    await prisma.budget.create({
                        data: {
                            projectId: toProjectId,
                            category: toCategory,
                            fiscalYear,
                            amountINR: amount
                        }
                    });
                }
            }

            await createAuditLog(req.user?.userId, 'TRANSFER', 'Budget', transfer.id, undefined, {
                fromProjectId,
                toProjectId,
                fromCategory,
                toCategory,
                amount,
                reason
            }, req);

            res.status(201).json(transfer);
        } catch (error) {
            console.error('Budget transfer error:', error);
            res.status(500).json({ error: 'Failed to transfer budget' });
        }
    },

    // Allocate budget to project
    async allocateBudget(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!canManageBudget(req.user!.role)) {
                res.status(403).json({ error: 'Permission denied' });
                return;
            }

            const validation = budgetAllocationSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({ error: validation.error.errors });
                return;
            }

            const { projectId, category, amount, fiscalYear } = validation.data;

            // Check if budget already exists
            const existing = await prisma.budget.findFirst({
                where: { projectId, category, fiscalYear }
            });

            let budget;
            if (existing) {
                budget = await prisma.budget.update({
                    where: { id: existing.id },
                    data: { amountINR: existing.amountINR + amount }
                });
            } else {
                budget = await prisma.budget.create({
                    data: {
                        projectId,
                        category,
                        fiscalYear,
                        amountINR: amount
                    }
                });
            }

            await createAuditLog(req.user?.userId, 'ALLOCATE', 'Budget', budget.id, undefined, { projectId, category, amount, fiscalYear }, req);

            res.status(201).json(budget);
        } catch (error) {
            console.error('Allocate budget error:', error);
            res.status(500).json({ error: 'Failed to allocate budget' });
        }
    },

    // Get all pending budget requests
    async getPendingRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!canManageBudget(req.user!.role)) {
                res.status(403).json({ error: 'Permission denied' });
                return;
            }

            const requests = await prisma.budgetRequest.findMany({
                where: { status: 'PENDING' },
                include: {
                    project: { select: { code: true, title: true, category: true } },
                    requestedBy: { select: { firstName: true, lastName: true, email: true, designation: true } }
                },
                orderBy: { createdAt: 'asc' }
            });

            res.json(requests);
        } catch (error) {
            console.error('Get pending requests error:', error);
            res.status(500).json({ error: 'Failed to fetch pending requests' });
        }
    },

    // Get budget summary for fiscal year
    async getYearlySummary(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { year } = req.params;
            const fiscalYear = year || getCurrentFiscalYear();

            const budgets = await prisma.budget.findMany({
                where: { fiscalYear },
                include: { project: { select: { code: true, title: true, category: true } } }
            });

            // Aggregate by category
            const categoryTotals: Record<string, { allocated: number; utilized: number }> = {};
            let totalAllocated = 0;
            let totalUtilized = 0;

            for (const budget of budgets) {
                if (!categoryTotals[budget.category]) {
                    categoryTotals[budget.category] = { allocated: 0, utilized: 0 };
                }
                categoryTotals[budget.category].allocated += budget.amountINR;
                categoryTotals[budget.category].utilized += budget.utilized;
                totalAllocated += budget.amountINR;
                totalUtilized += budget.utilized;
            }

            res.json({
                fiscalYear,
                totalAllocated,
                totalUtilized,
                remaining: totalAllocated - totalUtilized,
                utilizationPercent: totalAllocated > 0 ? Math.round((totalUtilized / totalAllocated) * 100) : 0,
                byCategory: categoryTotals,
                budgets
            });
        } catch (error) {
            console.error('Get yearly summary error:', error);
            res.status(500).json({ error: 'Failed to fetch yearly summary' });
        }
    },

    // Archive budgets and carry forward
    async archiveYearEnd(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!canManageBudget(req.user!.role)) {
                res.status(403).json({ error: 'Permission denied' });
                return;
            }

            const { fiscalYear, carryForwardPercent = 100 } = req.body;

            const budgets = await prisma.budget.findMany({
                where: { fiscalYear }
            });

            const archives = [];
            for (const budget of budgets) {
                const remaining = budget.amountINR - budget.utilized;
                const carryForward = (remaining * carryForwardPercent) / 100;

                const archive = await prisma.budgetArchive.create({
                    data: {
                        projectId: budget.projectId,
                        fiscalYear,
                        category: budget.category as any,
                        allocatedAmount: budget.amountINR,
                        utilizedAmount: budget.utilized,
                        carriedForward: carryForward,
                        returnedToCSIR: remaining - carryForward
                    }
                });
                archives.push(archive);
            }

            await createAuditLog(req.user?.userId, 'ARCHIVE', 'Budget', fiscalYear, undefined, {
                budgetCount: archives.length,
                carryForwardPercent
            }, req);

            res.json({
                message: `Archived ${archives.length} budget entries for ${fiscalYear}`,
                archives
            });
        } catch (error) {
            console.error('Archive error:', error);
            res.status(500).json({ error: 'Failed to archive budgets' });
        }
    },

    // Get budget transfers history
    async getTransfers(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { fiscalYear, projectId } = req.query;

            const where: any = {};
            if (fiscalYear) where.fiscalYear = fiscalYear;
            if (projectId) {
                where.OR = [{ fromProjectId: projectId }, { toProjectId: projectId }];
            }

            const transfers = await prisma.budgetTransfer.findMany({
                where,
                orderBy: { createdAt: 'desc' }
            });

            res.json(transfers);
        } catch (error) {
            console.error('Get transfers error:', error);
            res.status(500).json({ error: 'Failed to fetch transfers' });
        }
    }
};
