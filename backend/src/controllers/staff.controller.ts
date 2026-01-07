// Staff Assignment and Management Controller
// Handles bulk/single assignment to projects and notifications

import { Response } from 'express';
import prisma from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../middleware/audit.middleware.js';
import { z } from 'zod';
import nodemailer from 'nodemailer';

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER || 'ictserc@gmail.com',
        pass: process.env.SMTP_PASS || 'yyhoakynckydyybm'
    }
});

// Validation schemas
const bulkAssignSchema = z.object({
    staffIds: z.array(z.string().uuid()).min(1, 'At least one staff member is required'),
    projectId: z.string().uuid(),
    role: z.string().optional()
});

const singleAssignSchema = z.object({
    projectId: z.string().uuid(),
    role: z.string().optional()
});

// Check if user has permission to manage staff assignments
const canManageStaff = (role: string): boolean => {
    return ['ADMIN', 'SUPERVISOR', 'DIRECTOR', 'DIRECTOR_GENERAL'].includes(role);
};

// Send assignment notification email
async function sendAssignmentEmail(
    staffEmail: string,
    staffName: string,
    projectCode: string,
    projectTitle: string,
    projectHeadName: string
): Promise<boolean> {
    try {
        await transporter.sendMail({
            from: '"CSIR-SERC PMS" <ictserc@gmail.com>',
            to: staffEmail,
            subject: `Project Assignment: ${projectCode}`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #0369cc 0%, #6366f1 100%); padding: 24px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0;">Project Assignment Notification</h1>
                    </div>
                    <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                        <p>Dear ${staffName},</p>
                        <p>You have been assigned to the following project:</p>
                        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                            <tr>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fff; font-weight: bold;">Project Code</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fff;">${projectCode}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fff; font-weight: bold;">Project Title</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fff;">${projectTitle}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fff; font-weight: bold;">Project Head</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fff;">${projectHeadName}</td>
                            </tr>
                        </table>
                        <p>Please log in to the <a href="https://pms.serc.res.in" style="color: #0369cc;">CSIR-SERC Project Management Portal</a> to view project details.</p>
                        <p style="color: #64748b; font-size: 14px;">This is an automated message from the PMS system.</p>
                    </div>
                </div>
            `
        });
        return true;
    } catch (error) {
        console.error('Email send error:', error);
        return false;
    }
}

// Create in-app notification
async function createAssignmentNotification(
    userId: string,
    projectId: string,
    projectCode: string,
    projectTitle: string
) {
    return prisma.notification.create({
        data: {
            userId,
            type: 'ASSIGNMENT',
            title: 'New Project Assignment',
            message: `You have been assigned to project ${projectCode}: ${projectTitle}`,
            link: `/projects/${projectId}`,
            isRead: false
        }
    });
}

export const staffController = {
    // Bulk assign staff to project
    async bulkAssign(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!canManageStaff(req.user!.role)) {
                res.status(403).json({ error: 'Permission denied. Only Admin, BKMD Head, Director can assign staff.' });
                return;
            }

            const validation = bulkAssignSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({ error: validation.error.errors });
                return;
            }

            const { staffIds, projectId, role } = validation.data;

            // Get project details
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                include: {
                    projectHead: { select: { firstName: true, lastName: true, email: true } }
                }
            });

            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Get staff details
            const staffMembers = await prisma.user.findMany({
                where: { id: { in: staffIds }, isActive: true }
            });

            if (staffMembers.length === 0) {
                res.status(400).json({ error: 'No valid staff members found' });
                return;
            }

            const results = {
                assigned: [] as string[],
                alreadyAssigned: [] as string[],
                failed: [] as string[],
                notified: [] as string[]
            };

            for (const staff of staffMembers) {
                try {
                    // Check if already assigned
                    const existing = await prisma.projectStaff.findUnique({
                        where: { projectId_userId: { projectId, userId: staff.id } }
                    });

                    if (existing) {
                        if (!existing.isActive) {
                            // Reactivate
                            await prisma.projectStaff.update({
                                where: { id: existing.id },
                                data: { isActive: true, leftAt: null, role }
                            });
                            results.assigned.push(staff.email);
                        } else {
                            results.alreadyAssigned.push(staff.email);
                            continue;
                        }
                    } else {
                        // Create new assignment
                        await prisma.projectStaff.create({
                            data: {
                                projectId,
                                userId: staff.id,
                                role: role || 'Team Member',
                                isActive: true
                            }
                        });
                        results.assigned.push(staff.email);
                    }

                    // Create in-app notification
                    await createAssignmentNotification(staff.id, projectId, project.code, project.title);

                    // Send email notification
                    const emailSent = await sendAssignmentEmail(
                        staff.email,
                        `${staff.firstName} ${staff.lastName}`,
                        project.code,
                        project.title,
                        `${project.projectHead.firstName} ${project.projectHead.lastName}`
                    );

                    if (emailSent) results.notified.push(staff.email);
                } catch (error) {
                    results.failed.push(staff.email);
                }
            }

            // Notify project head
            if (results.assigned.length > 0) {
                await prisma.notification.create({
                    data: {
                        userId: project.projectHeadId,
                        type: 'ASSIGNMENT',
                        title: 'New Team Members Added',
                        message: `${results.assigned.length} new team member(s) have been added to ${project.code}`,
                        link: `/projects/${projectId}`,
                        isRead: false
                    }
                });
            }

            // Audit log
            await createAuditLog(req.user?.userId, 'BULK_ASSIGN', 'ProjectStaff', projectId, undefined, {
                staffCount: results.assigned.length,
                staffEmails: results.assigned
            }, req);

            res.json({
                message: `Successfully assigned ${results.assigned.length} staff member(s)`,
                results
            });
        } catch (error) {
            console.error('Bulk assign error:', error);
            res.status(500).json({ error: 'Failed to assign staff members' });
        }
    },

    // Single staff assignment
    async assignToProject(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!canManageStaff(req.user!.role)) {
                res.status(403).json({ error: 'Permission denied' });
                return;
            }

            const { userId } = req.params;
            const validation = singleAssignSchema.safeParse(req.body);

            if (!validation.success) {
                res.status(400).json({ error: validation.error.errors });
                return;
            }

            const { projectId, role } = validation.data;

            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const project = await prisma.project.findUnique({
                where: { id: projectId },
                include: { projectHead: { select: { firstName: true, lastName: true } } }
            });
            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Upsert assignment
            const assignment = await prisma.projectStaff.upsert({
                where: { projectId_userId: { projectId, userId } },
                update: { isActive: true, leftAt: null, role: role || 'Team Member' },
                create: { projectId, userId, role: role || 'Team Member', isActive: true }
            });

            // Create notification
            await createAssignmentNotification(userId, projectId, project.code, project.title);

            // Send email
            await sendAssignmentEmail(
                user.email,
                `${user.firstName} ${user.lastName}`,
                project.code,
                project.title,
                `${project.projectHead.firstName} ${project.projectHead.lastName}`
            );

            res.json({ message: 'Staff assigned successfully', assignment });
        } catch (error) {
            console.error('Assign error:', error);
            res.status(500).json({ error: 'Failed to assign staff' });
        }
    },

    // Remove staff from project
    async removeFromProject(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!canManageStaff(req.user!.role)) {
                res.status(403).json({ error: 'Permission denied' });
                return;
            }

            const { projectId, userId } = req.params;

            const assignment = await prisma.projectStaff.findUnique({
                where: { projectId_userId: { projectId, userId } }
            });

            if (!assignment) {
                res.status(404).json({ error: 'Assignment not found' });
                return;
            }

            // Soft delete (mark as inactive)
            await prisma.projectStaff.update({
                where: { id: assignment.id },
                data: { isActive: false, leftAt: new Date() }
            });

            await createAuditLog(req.user?.userId, 'REMOVE_STAFF', 'ProjectStaff', assignment.id, { userId, projectId }, undefined, req);

            res.json({ message: 'Staff removed from project successfully' });
        } catch (error) {
            console.error('Remove staff error:', error);
            res.status(500).json({ error: 'Failed to remove staff' });
        }
    },

    // Get staff assignments for a user
    async getUserAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { userId } = req.params;

            const assignments = await prisma.projectStaff.findMany({
                where: { userId, isActive: true },
                include: {
                    project: {
                        select: {
                            id: true,
                            code: true,
                            title: true,
                            status: true,
                            category: true,
                            projectHead: { select: { firstName: true, lastName: true, email: true } }
                        }
                    }
                },
                orderBy: { joinedAt: 'desc' }
            });

            res.json(assignments);
        } catch (error) {
            console.error('Get assignments error:', error);
            res.status(500).json({ error: 'Failed to fetch assignments' });
        }
    },

    // Get all staff with their project counts
    async getStaffWithProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const staff = await prisma.user.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    designation: true,
                    department: true,
                    role: true,
                    profileImage: true,
                    _count: {
                        select: {
                            projectMembership: { where: { isActive: true } },
                            projectsHeaded: true
                        }
                    }
                },
                orderBy: { firstName: 'asc' }
            });

            res.json(staff);
        } catch (error) {
            console.error('Get staff error:', error);
            res.status(500).json({ error: 'Failed to fetch staff' });
        }
    },

    // Push notification to all project heads (BKMD Head feature)
    async pushRequestUpdate(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!['ADMIN', 'SUPERVISOR'].includes(req.user!.role)) {
                res.status(403).json({ error: 'Only Admin or BKMD Head can send push notifications' });
                return;
            }

            const { message, projectIds } = req.body;

            let projectHeads;
            if (projectIds && projectIds.length > 0) {
                // Send to specific project heads
                projectHeads = await prisma.project.findMany({
                    where: { id: { in: projectIds }, status: 'ACTIVE' },
                    select: { projectHeadId: true, code: true, title: true }
                });
            } else {
                // Send to all active project heads
                projectHeads = await prisma.project.findMany({
                    where: { status: 'ACTIVE' },
                    select: { projectHeadId: true, code: true, title: true }
                });
            }

            const uniqueHeadIds = [...new Set(projectHeads.map(p => p.projectHeadId))];

            // Create notifications
            await prisma.notification.createMany({
                data: uniqueHeadIds.map(headId => ({
                    userId: headId,
                    type: 'PROJECT_UPDATE' as const,
                    title: 'Project Update Requested',
                    message: message || 'Please update your project status and submit progress report.',
                    link: '/projects',
                    isRead: false
                }))
            });

            // Optionally send emails
            const heads = await prisma.user.findMany({
                where: { id: { in: uniqueHeadIds } },
                select: { email: true, firstName: true, lastName: true }
            });

            for (const head of heads) {
                await transporter.sendMail({
                    from: '"CSIR-SERC PMS" <ictserc@gmail.com>',
                    to: head.email,
                    subject: 'Project Update Request - PMS Portal',
                    html: `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif;">
                            <h2>Project Update Requested</h2>
                            <p>Dear ${head.firstName} ${head.lastName},</p>
                            <p>${message || 'Please update your project status and submit progress report.'}</p>
                            <p><a href="https://pms.serc.res.in/projects">Click here to login and update</a></p>
                            <p style="color: #64748b;">- CSIR-SERC PMS System</p>
                        </div>
                    `
                }).catch((err: Error) => console.error('Email error:', err));
            }

            res.json({
                message: `Notifications sent to ${uniqueHeadIds.length} project heads`,
                notifiedCount: uniqueHeadIds.length
            });
        } catch (error) {
            console.error('Push notification error:', error);
            res.status(500).json({ error: 'Failed to send notifications' });
        }
    },

    // Update user role - ADMIN ONLY
    async updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            // Only ADMIN can change user roles
            if (req.user!.role !== 'ADMIN') {
                res.status(403).json({
                    error: 'Access denied',
                    message: 'Only System Administrator can manage user roles'
                });
                return;
            }

            const { userId } = req.params;
            const { role } = req.body;

            // Validate role
            const validRoles = ['ADMIN', 'DIRECTOR', 'DIRECTOR_GENERAL', 'SUPERVISOR', 'PROJECT_HEAD', 'EMPLOYEE', 'RC_MEMBER', 'EXTERNAL_OWNER'];
            if (!role || !validRoles.includes(role)) {
                res.status(400).json({
                    error: 'Invalid role',
                    validRoles
                });
                return;
            }

            // Get user
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, firstName: true, lastName: true, role: true }
            });

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Prevent changing own role (security measure)
            if (userId === req.user!.userId) {
                res.status(400).json({ error: 'Cannot change your own role' });
                return;
            }

            const oldRole = user.role;

            // Update role
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { role },
                select: { id: true, email: true, firstName: true, lastName: true, role: true }
            });

            // Audit log
            await createAuditLog(req.user?.userId, 'UPDATE_ROLE', 'User', userId, { role: oldRole }, { role }, req);

            // Notify user of role change
            await prisma.notification.create({
                data: {
                    userId,
                    type: 'SYSTEM',
                    title: 'Role Updated',
                    message: `Your role has been updated from ${oldRole} to ${role}`,
                    link: '/dashboard',
                    isRead: false
                }
            });

            res.json({
                message: `User role updated successfully`,
                user: updatedUser,
                previousRole: oldRole
            });
        } catch (error) {
            console.error('Update role error:', error);
            res.status(500).json({ error: 'Failed to update user role' });
        }
    },

    // Get page permissions by role - for frontend access control
    async getPagePermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const role = req.user?.role || 'EMPLOYEE';

            // Define page permissions by role
            const pagePermissions: Record<string, string[]> = {
                'ADMIN': ['dashboard', 'dg-dashboard', 'projects', 'staff', 'finance', 'reports', 'rc-meetings', 'documents', 'archive', 'settings'],
                'SUPERVISOR': ['dashboard', 'dg-dashboard', 'projects', 'staff', 'finance', 'reports', 'rc-meetings', 'documents', 'archive'],
                'DIRECTOR': ['dashboard', 'dg-dashboard', 'projects', 'staff', 'finance', 'reports', 'rc-meetings', 'documents', 'archive'],
                'DIRECTOR_GENERAL': ['dashboard', 'dg-dashboard', 'projects', 'reports', 'rc-meetings'],
                'PROJECT_HEAD': ['dashboard', 'projects', 'finance', 'documents', 'reports'],
                'EMPLOYEE': ['dashboard', 'projects', 'documents'],
                'RC_MEMBER': ['dashboard', 'projects', 'rc-meetings', 'reports'],
                'EXTERNAL_OWNER': ['dashboard', 'projects', 'documents']
            };

            const allowedPages = pagePermissions[role] || pagePermissions['EMPLOYEE'];

            res.json({
                role,
                allowedPages,
                isAdmin: role === 'ADMIN',
                canManageStaff: ['ADMIN', 'SUPERVISOR', 'DIRECTOR', 'DIRECTOR_GENERAL'].includes(role),
                canManageRoles: role === 'ADMIN',
                canManageFinance: ['ADMIN', 'SUPERVISOR', 'DIRECTOR'].includes(role)
            });
        } catch (error) {
            console.error('Get permissions error:', error);
            res.status(500).json({ error: 'Failed to get permissions' });
        }
    },

    // Get all users with their roles (for role management page)
    async getUsersForRoleManagement(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            // Only ADMIN can view this
            if (req.user!.role !== 'ADMIN') {
                res.status(403).json({ error: 'Access denied. Admin only.' });
                return;
            }

            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    designation: true,
                    department: true,
                    role: true,
                    isActive: true,
                    lastLogin: true,
                    _count: {
                        select: {
                            projectMembership: { where: { isActive: true } }
                        }
                    }
                },
                orderBy: [{ role: 'asc' }, { firstName: 'asc' }]
            });

            const roleGroups = {
                ADMIN: users.filter(u => u.role === 'ADMIN'),
                SUPERVISOR: users.filter(u => u.role === 'SUPERVISOR'),
                DIRECTOR: users.filter(u => u.role === 'DIRECTOR'),
                DIRECTOR_GENERAL: users.filter(u => u.role === 'DIRECTOR_GENERAL'),
                PROJECT_HEAD: users.filter(u => u.role === 'PROJECT_HEAD'),
                EMPLOYEE: users.filter(u => u.role === 'EMPLOYEE'),
                RC_MEMBER: users.filter(u => u.role === 'RC_MEMBER'),
                EXTERNAL_OWNER: users.filter(u => u.role === 'EXTERNAL_OWNER')
            };

            res.json({
                users,
                roleGroups,
                totalCount: users.length
            });
        } catch (error) {
            console.error('Get users for role management error:', error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    }
};
