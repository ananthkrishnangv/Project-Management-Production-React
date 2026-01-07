// Project Report Controller
// Handles project updates/reports with rich text, file upload, and approval workflow

import { Response, Request } from 'express';
import prisma from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../middleware/audit.middleware.js';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER || 'ictserc@gmail.com',
        pass: process.env.SMTP_PASS || 'yyhoakynckydyybm'
    }
});

// File upload configuration
const uploadDir = path.join(process.cwd(), 'uploads', 'reports');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        cb(null, uploadDir);
    },
    filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `report-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

export const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, PNG, JPG, DOC, DOCX are allowed.'));
        }
    }
});

// Validation schemas
const createReportSchema = z.object({
    reportType: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'COMPLETION', 'PROGRESS']),
    title: z.string().min(1),
    content: z.string().min(1),
    period: z.string().optional()
});

// Check if user can manage reports
const canApproveReports = (role: string): boolean => {
    return ['ADMIN', 'SUPERVISOR', 'DIRECTOR'].includes(role);
};

// Check if user can submit reports for project
const canSubmitReport = async (userId: string, projectId: string): Promise<boolean> => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            staff: { where: { userId, isActive: true } }
        }
    });

    if (!project) return false;

    // Project head or active team member can submit
    return project.projectHeadId === userId || project.staff.length > 0;
};

export const reportController = {
    // Create project report/update
    async createReport(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { projectId } = req.params;
            const userId = req.user!.userId;

            // Check permission
            const canSubmit = await canSubmitReport(userId, projectId);
            if (!canSubmit) {
                res.status(403).json({ error: 'You are not authorized to submit reports for this project' });
                return;
            }

            const validation = createReportSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({ error: validation.error.errors });
                return;
            }

            const { reportType, title, content, period } = validation.data;

            // Get project details
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                include: { projectHead: { select: { firstName: true, lastName: true, email: true } } }
            });

            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Create report
            const report = await prisma.projectReport.create({
                data: {
                    projectId,
                    reportType: reportType as any,
                    title,
                    content,
                    period,
                    submittedById: userId,
                    status: reportType === 'COMPLETION' ? 'PENDING' : 'APPROVED' // Completion requires approval
                }
            });

            // Update project's updatedAt
            await prisma.project.update({
                where: { id: projectId },
                data: { updatedAt: new Date() }
            });

            // For completion reports, notify BKMD Head for approval
            if (reportType === 'COMPLETION') {
                const supervisors = await prisma.user.findMany({
                    where: { role: 'SUPERVISOR', isActive: true }
                });

                for (const supervisor of supervisors) {
                    await prisma.notification.create({
                        data: {
                            userId: supervisor.id,
                            type: 'APPROVAL_REQUIRED',
                            title: 'Project Completion Report - Approval Required',
                            message: `Completion report submitted for ${project.code}: ${project.title}`,
                            link: `/projects/${projectId}/reports/${report.id}`,
                            isRead: false
                        }
                    });
                }

                // Also notify project head
                await transporter.sendMail({
                    from: '"CSIR-SERC PMS" <ictserc@gmail.com>',
                    to: project.projectHead.email,
                    subject: `Completion Report Submitted: ${project.code}`,
                    html: `
                        <h2>Completion Report Submitted</h2>
                        <p>A completion report has been submitted for review:</p>
                        <p><strong>Project:</strong> ${project.code} - ${project.title}</p>
                        <p><strong>Title:</strong> ${title}</p>
                        <p>The report is pending approval from Head, BKMD.</p>
                    `
                }).catch((err: Error) => console.error('Email error:', err));
            }

            await createAuditLog(userId, 'CREATE', 'ProjectReport', report.id, undefined, {
                projectCode: project.code,
                reportType,
                title
            }, req);

            res.status(201).json(report);
        } catch (error) {
            console.error('Create report error:', error);
            res.status(500).json({ error: 'Failed to create report' });
        }
    },

    // Get project reports
    async getProjectReports(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { projectId } = req.params;
            const { type, status } = req.query;

            const where: any = { projectId };
            if (type) where.reportType = type;
            if (status) where.status = status;

            const reports = await prisma.projectReport.findMany({
                where,
                include: {
                    submittedBy: { select: { firstName: true, lastName: true, email: true } },
                    approvedBy: { select: { firstName: true, lastName: true } },
                    attachments: true
                },
                orderBy: { createdAt: 'desc' }
            });

            res.json(reports);
        } catch (error) {
            console.error('Get reports error:', error);
            res.status(500).json({ error: 'Failed to fetch reports' });
        }
    },

    // Get single report
    async getReport(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { reportId } = req.params;

            const report = await prisma.projectReport.findUnique({
                where: { id: reportId },
                include: {
                    project: { select: { id: true, code: true, title: true } },
                    submittedBy: { select: { firstName: true, lastName: true, email: true } },
                    approvedBy: { select: { firstName: true, lastName: true } },
                    attachments: true
                }
            });

            if (!report) {
                res.status(404).json({ error: 'Report not found' });
                return;
            }

            res.json(report);
        } catch (error) {
            console.error('Get report error:', error);
            res.status(500).json({ error: 'Failed to fetch report' });
        }
    },

    // Approve/Reject report (BKMD Head, Director)
    async approveReport(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!canApproveReports(req.user!.role)) {
                res.status(403).json({ error: 'Permission denied' });
                return;
            }

            const { reportId } = req.params;
            const { action, comments } = req.body;

            if (!['APPROVED', 'REJECTED'].includes(action)) {
                res.status(400).json({ error: 'Invalid action. Use APPROVED or REJECTED' });
                return;
            }

            const report = await prisma.projectReport.findUnique({
                where: { id: reportId },
                include: {
                    project: { include: { projectHead: true } },
                    submittedBy: true
                }
            });

            if (!report) {
                res.status(404).json({ error: 'Report not found' });
                return;
            }

            // Update report status
            const updatedReport = await prisma.projectReport.update({
                where: { id: reportId },
                data: {
                    status: action,
                    approvedById: req.user!.userId,
                    approvedAt: new Date(),
                    comments
                }
            });

            // If completion report approved, notify BKMD Head for project closure
            if (report.reportType === 'COMPLETION' && action === 'APPROVED') {
                await prisma.notification.create({
                    data: {
                        userId: report.project.projectHeadId,
                        type: 'PROJECT_CLOSURE',
                        title: 'Completion Report Approved',
                        message: `Your completion report for ${report.project.code} has been approved. Proceed with final closure.`,
                        link: `/projects/${report.projectId}`,
                        isRead: false
                    }
                });

                // Update project status
                await prisma.project.update({
                    where: { id: report.projectId },
                    data: { status: 'COMPLETED' }
                });
            }

            // Notify submitter
            await prisma.notification.create({
                data: {
                    userId: report.submittedById,
                    type: 'APPROVAL_REQUIRED',
                    title: `Report ${action}`,
                    message: `Your ${report.reportType} report for ${report.project.code} has been ${action.toLowerCase()}.${comments ? ' Comments: ' + comments : ''}`,
                    link: `/projects/${report.projectId}/reports/${reportId}`,
                    isRead: false
                }
            });

            await createAuditLog(req.user?.userId, 'APPROVE', 'ProjectReport', reportId, { status: report.status }, { status: action }, req);

            res.json(updatedReport);
        } catch (error) {
            console.error('Approve report error:', error);
            res.status(500).json({ error: 'Failed to approve report' });
        }
    },

    // Upload attachment to report
    async uploadAttachment(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { reportId } = req.params;
            const file = req.file;

            if (!file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }

            const report = await prisma.projectReport.findUnique({ where: { id: reportId } });
            if (!report) {
                res.status(404).json({ error: 'Report not found' });
                return;
            }

            const attachment = await prisma.reportAttachment.create({
                data: {
                    reportId,
                    fileType: file.mimetype.split('/')[1].toUpperCase(),
                    fileName: file.originalname,
                    filePath: file.path,
                    fileSize: file.size
                }
            });

            res.status(201).json(attachment);
        } catch (error) {
            console.error('Upload attachment error:', error);
            res.status(500).json({ error: 'Failed to upload attachment' });
        }
    },

    // Get all pending approval reports (for BKMD Head)
    async getPendingReports(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!canApproveReports(req.user!.role)) {
                res.status(403).json({ error: 'Permission denied' });
                return;
            }

            const reports = await prisma.projectReport.findMany({
                where: { status: 'PENDING' },
                include: {
                    project: { select: { id: true, code: true, title: true, category: true } },
                    submittedBy: { select: { firstName: true, lastName: true, email: true } },
                    attachments: true
                },
                orderBy: { createdAt: 'asc' }
            });

            res.json(reports);
        } catch (error) {
            console.error('Get pending reports error:', error);
            res.status(500).json({ error: 'Failed to fetch pending reports' });
        }
    },

    // Export report data to PDF or Excel
    async exportReport(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { format, type } = req.query;

            if (!format || !['pdf', 'excel'].includes(format as string)) {
                res.status(400).json({ error: 'Invalid format. Use pdf or excel' });
                return;
            }

            // Fetch data based on type
            let data: any = {};
            const reportDate = new Date().toISOString().split('T')[0];

            // Get projects summary
            const projects = await prisma.project.findMany({
                select: {
                    code: true,
                    title: true,
                    category: true,
                    status: true,
                    progress: true,
                    projectHead: { select: { firstName: true, lastName: true } },
                    vertical: { select: { name: true } },
                    startDate: true,
                    endDate: true,
                    _count: { select: { staff: true } }
                },
                orderBy: { code: 'asc' }
            });

            // Get budget summary
            const budgets = await prisma.budget.groupBy({
                by: ['category'],
                _sum: { amountINR: true, utilized: true }
            });

            // Get project counts by status
            const projectCounts = await prisma.project.groupBy({
                by: ['status'],
                _count: true
            });

            // Get project counts by category
            const categoryCounts = await prisma.project.groupBy({
                by: ['category'],
                _count: true
            });

            data = {
                reportDate,
                reportType: type || 'dashboard',
                projects,
                budgets,
                projectCounts,
                categoryCounts,
                totalProjects: projects.length,
                generatedBy: `${req.user?.email}`
            };

            if (format === 'excel') {
                // Generate Excel using simple CSV format (no external lib needed)
                let csvContent = 'CSIR-SERC Project Management Report\n';
                csvContent += `Generated: ${reportDate}\n\n`;

                csvContent += 'PROJECT SUMMARY\n';
                csvContent += 'Code,Title,Category,Status,Progress,Project Head,Vertical,Start Date,End Date,Team Size\n';

                for (const p of projects) {
                    csvContent += `"${p.code}","${p.title}","${p.category}","${p.status}",${p.progress}%,"${p.projectHead?.firstName || ''} ${p.projectHead?.lastName || ''}","${p.vertical?.name || ''}","${p.startDate.toISOString().split('T')[0]}","${p.endDate.toISOString().split('T')[0]}",${p._count.staff}\n`;
                }

                csvContent += '\nBUDGET SUMMARY BY CATEGORY\n';
                csvContent += 'Category,Allocated (INR),Utilized (INR)\n';
                for (const b of budgets) {
                    csvContent += `"${b.category}",${b._sum.amountINR || 0},${b._sum.utilized || 0}\n`;
                }

                csvContent += '\nPROJECT STATUS DISTRIBUTION\n';
                csvContent += 'Status,Count\n';
                for (const pc of projectCounts) {
                    csvContent += `"${pc.status}",${pc._count}\n`;
                }

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="report_${type || 'dashboard'}_${reportDate}.csv"`);
                res.send(csvContent);
                return;
            }

            if (format === 'pdf') {
                // Generate simple HTML that can be printed as PDF
                const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CSIR-SERC Project Report</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 1200px; margin: 0 auto; }
        h1 { color: #0369cc; border-bottom: 2px solid #0369cc; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
        th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        tr:nth-child(even) { background: #f9fafb; }
        .summary-card { display: inline-block; background: #f0f9ff; padding: 20px; margin: 10px; border-radius: 8px; min-width: 150px; }
        .summary-card h3 { margin: 0; color: #64748b; font-size: 14px; }
        .summary-card .value { font-size: 28px; font-weight: bold; color: #0369cc; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-primary { background: #dbeafe; color: #1e40af; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 12px; }
        @media print { body { padding: 20px; } }
    </style>
</head>
<body>
    <h1>CSIR-SERC Project Management Report</h1>
    <p><strong>Report Date:</strong> ${reportDate}</p>
    <p><strong>Generated By:</strong> ${req.user?.email}</p>
    
    <div style="margin: 30px 0;">
        <div class="summary-card">
            <h3>Total Projects</h3>
            <div class="value">${projects.length}</div>
        </div>
        <div class="summary-card">
            <h3>Active Projects</h3>
            <div class="value">${projectCounts.find((p: any) => p.status === 'ACTIVE')?._count || 0}</div>
        </div>
        <div class="summary-card">
            <h3>Completed</h3>
            <div class="value">${projectCounts.find((p: any) => p.status === 'COMPLETED')?._count || 0}</div>
        </div>
    </div>
    
    <h2>Project Summary</h2>
    <table>
        <thead>
            <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Project Head</th>
                <th>End Date</th>
            </tr>
        </thead>
        <tbody>
            ${projects.slice(0, 50).map((p: any) => `
            <tr>
                <td>${p.code}</td>
                <td>${p.title.substring(0, 50)}${p.title.length > 50 ? '...' : ''}</td>
                <td>${p.category}</td>
                <td><span class="badge badge-${p.status === 'ACTIVE' ? 'success' : p.status === 'COMPLETED' ? 'primary' : 'warning'}">${p.status}</span></td>
                <td>${p.progress}%</td>
                <td>${p.projectHead?.firstName || ''} ${p.projectHead?.lastName || ''}</td>
                <td>${p.endDate.toISOString().split('T')[0]}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    ${projects.length > 50 ? '<p><em>Showing first 50 projects. Export to Excel for complete list.</em></p>' : ''}
    
    <h2>Budget Summary by Category</h2>
    <table>
        <thead>
            <tr>
                <th>Category</th>
                <th>Allocated (₹ Lakhs)</th>
                <th>Utilized (₹ Lakhs)</th>
                <th>Utilization %</th>
            </tr>
        </thead>
        <tbody>
            ${budgets.map((b: any) => `
            <tr>
                <td>${b.category}</td>
                <td>${((b._sum.amountINR || 0) / 100000).toFixed(2)}</td>
                <td>${((b._sum.utilized || 0) / 100000).toFixed(2)}</td>
                <td>${b._sum.amountINR ? ((b._sum.utilized || 0) / b._sum.amountINR * 100).toFixed(1) : 0}%</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    
    <h2>Projects by Category</h2>
    <table style="width: 50%;">
        <thead>
            <tr><th>Category</th><th>Count</th></tr>
        </thead>
        <tbody>
            ${categoryCounts.map((c: any) => `<tr><td>${c.category}</td><td>${c._count}</td></tr>`).join('')}
        </tbody>
    </table>
    
    <div class="footer">
        <p>Generated by CSIR-SERC Project Management System</p>
        <p>© ${new Date().getFullYear()} CSIR-Structural Engineering Research Centre, Chennai</p>
    </div>
    
    <script>
        // Auto-print when opened
        window.onload = function() {
            window.print();
        }
    </script>
</body>
</html>
                `;

                res.setHeader('Content-Type', 'text/html');
                res.setHeader('Content-Disposition', `inline; filename="report_${type || 'dashboard'}_${reportDate}.html"`);
                res.send(htmlContent);
                return;
            }

            res.status(400).json({ error: 'Export failed' });
        } catch (error) {
            console.error('Export report error:', error);
            res.status(500).json({ error: 'Failed to export report' });
        }
    }
};
