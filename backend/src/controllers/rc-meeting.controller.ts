import { Response } from 'express';
import prisma from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../middleware/audit.middleware.js';
import { notificationService } from '../services/notification.service.js';
import { z } from 'zod';

// Validation schemas
const createMeetingSchema = z.object({
    title: z.string().min(1),
    meetingNumber: z.number().int().positive(),
    date: z.string(),
    venue: z.string().optional(),
    description: z.string().optional(),
});

const agendaItemSchema = z.object({
    projectId: z.string().uuid().optional(),
    itemNumber: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(['Project Review', 'New Proposal', 'General', 'Budget', 'Other']),
    presenter: z.string().optional(),
    duration: z.number().int().positive().optional(),
});

const minutesSchema = z.object({
    content: z.string().min(1),
    isFinal: z.boolean().optional(),
});

// Get all RC meetings
export const getMeetings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { status, year } = req.query;

        const where: any = {};
        if (status) where.status = status;
        if (year) {
            const yearNum = parseInt(year as string, 10);
            where.date = {
                gte: new Date(`${yearNum}-01-01`),
                lt: new Date(`${yearNum + 1}-01-01`),
            };
        }

        const meetings = await prisma.rCMeeting.findMany({
            where,
            include: {
                _count: {
                    select: {
                        agendaItems: true,
                        minutes: true,
                    },
                },
            },
            orderBy: { date: 'desc' },
        });

        res.json(meetings);
    } catch (error) {
        console.error('Get meetings error:', error);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
};

// Get single meeting with details
export const getMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const meeting = await prisma.rCMeeting.findUnique({
            where: { id },
            include: {
                agendaItems: {
                    orderBy: { itemNumber: 'asc' },
                    include: {
                        project: {
                            select: {
                                id: true,
                                code: true,
                                title: true,
                                status: true,
                                progress: true,
                            },
                        },
                    },
                },
                minutes: {
                    orderBy: { version: 'desc' },
                    include: {
                        createdBy: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });

        if (!meeting) {
            res.status(404).json({ error: 'Meeting not found' });
            return;
        }

        res.json(meeting);
    } catch (error) {
        console.error('Get meeting error:', error);
        res.status(500).json({ error: 'Failed to fetch meeting' });
    }
};

// Create meeting
export const createMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const data = createMeetingSchema.parse(req.body);

        const meeting = await prisma.rCMeeting.create({
            data: {
                title: data.title,
                meetingNumber: data.meetingNumber,
                date: new Date(data.date),
                venue: data.venue,
                description: data.description,
                status: 'SCHEDULED',
            },
        });

        await createAuditLog(
            req.user?.userId,
            'CREATE',
            'RCMeeting',
            meeting.id,
            undefined,
            meeting,
            req
        );

        // Notify all project heads about the meeting
        const projectHeads = await prisma.user.findMany({
            where: {
                role: { in: ['PROJECT_HEAD', 'DIRECTOR', 'SUPERVISOR'] },
                isActive: true,
            },
            select: { id: true },
        });

        for (const user of projectHeads) {
            await notificationService.sendRCMeetingNotification(
                user.id,
                data.title,
                new Date(data.date)
            );
        }

        res.status(201).json(meeting);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Create meeting error:', error);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
};

// Update meeting
export const updateMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, date, venue, description, status } = req.body;

        const existingMeeting = await prisma.rCMeeting.findUnique({
            where: { id },
        });

        if (!existingMeeting) {
            res.status(404).json({ error: 'Meeting not found' });
            return;
        }

        const meeting = await prisma.rCMeeting.update({
            where: { id },
            data: {
                title,
                date: date ? new Date(date) : undefined,
                venue,
                description,
                status,
            },
        });

        await createAuditLog(
            req.user?.userId,
            'UPDATE',
            'RCMeeting',
            meeting.id,
            existingMeeting,
            meeting,
            req
        );

        res.json(meeting);
    } catch (error) {
        console.error('Update meeting error:', error);
        res.status(500).json({ error: 'Failed to update meeting' });
    }
};

// Add agenda item
export const addAgendaItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const data = agendaItemSchema.parse(req.body);

        const agendaItem = await prisma.rCAgendaItem.create({
            data: {
                meetingId: id,
                projectId: data.projectId,
                itemNumber: data.itemNumber,
                title: data.title,
                description: data.description,
                type: data.type,
                presenter: data.presenter,
                duration: data.duration,
            },
        });

        res.status(201).json(agendaItem);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Add agenda item error:', error);
        res.status(500).json({ error: 'Failed to add agenda item' });
    }
};

// Update agenda item
export const updateAgendaItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id, itemId } = req.params;
        const { title, description, type, presenter, duration, status, remarks } = req.body;

        const agendaItem = await prisma.rCAgendaItem.update({
            where: { id: itemId },
            data: {
                title,
                description,
                type,
                presenter,
                duration,
                status,
                remarks,
            },
        });

        res.json(agendaItem);
    } catch (error) {
        console.error('Update agenda item error:', error);
        res.status(500).json({ error: 'Failed to update agenda item' });
    }
};

// Delete agenda item
export const deleteAgendaItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { itemId } = req.params;

        await prisma.rCAgendaItem.delete({
            where: { id: itemId },
        });

        res.json({ message: 'Agenda item deleted successfully' });
    } catch (error) {
        console.error('Delete agenda item error:', error);
        res.status(500).json({ error: 'Failed to delete agenda item' });
    }
};

// Record minutes
export const recordMinutes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const data = minutesSchema.parse(req.body);

        // Get the latest version
        const latestMinutes = await prisma.rCMinutes.findFirst({
            where: { meetingId: id },
            orderBy: { version: 'desc' },
        });

        const nextVersion = (latestMinutes?.version || 0) + 1;

        const minutes = await prisma.rCMinutes.create({
            data: {
                meetingId: id,
                createdById: req.user!.userId,
                content: data.content,
                version: nextVersion,
                isFinal: data.isFinal || false,
            },
        });

        // If final, notify project heads
        if (data.isFinal) {
            const meeting = await prisma.rCMeeting.findUnique({
                where: { id },
                include: {
                    agendaItems: {
                        where: { projectId: { not: null } },
                        include: {
                            project: {
                                select: { projectHeadId: true },
                            },
                        },
                    },
                },
            });

            if (meeting) {
                const projectHeadIds = new Set(
                    meeting.agendaItems
                        .filter(item => item.project?.projectHeadId)
                        .map(item => item.project!.projectHeadId)
                );

                for (const userId of projectHeadIds) {
                    await notificationService.createNotification({
                        userId,
                        type: 'RC_MEETING',
                        title: 'RC Meeting Minutes Published',
                        message: `Minutes for "${meeting.title}" have been finalized.`,
                        link: `/rc-meetings/${id}`,
                        sendEmail: true,
                    });
                }

                // Update meeting status
                await prisma.rCMeeting.update({
                    where: { id },
                    data: { status: 'COMPLETED' },
                });
            }
        }

        res.status(201).json(minutes);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Record minutes error:', error);
        res.status(500).json({ error: 'Failed to record minutes' });
    }
};

// Generate meeting pack (agenda + project stats)
export const generateMeetingPack = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const meeting = await prisma.rCMeeting.findUnique({
            where: { id },
            include: {
                agendaItems: {
                    orderBy: { itemNumber: 'asc' },
                    include: {
                        project: {
                            include: {
                                vertical: true,
                                projectHead: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                        designation: true,
                                    },
                                },
                                staff: { where: { isActive: true } },
                                budgets: true,
                                expenses: true,
                                milestones: true,
                                outputs: true,
                            },
                        },
                    },
                },
            },
        });

        if (!meeting) {
            res.status(404).json({ error: 'Meeting not found' });
            return;
        }

        // Build meeting pack data
        const meetingPack = {
            meetingInfo: {
                title: meeting.title,
                number: meeting.meetingNumber,
                date: meeting.date,
                venue: meeting.venue,
            },
            agenda: meeting.agendaItems.map(item => {
                const project = item.project;
                let projectStats = null;

                if (project) {
                    const totalBudget = project.budgets.reduce((sum, b) => sum + b.amountINR, 0);
                    const totalExpenses = project.expenses.reduce((sum, e) => sum + e.amountINR, 0);
                    const completedMilestones = project.milestones.filter(m => m.status === 'COMPLETED').length;

                    projectStats = {
                        code: project.code,
                        title: project.title,
                        status: project.status,
                        progress: project.progress,
                        vertical: project.vertical?.name,
                        pi: `${project.projectHead?.firstName} ${project.projectHead?.lastName}`,
                        staffCount: project.staff.length,
                        budget: {
                            total: totalBudget,
                            utilized: totalExpenses,
                            utilizationPercent: totalBudget > 0
                                ? Math.round((totalExpenses / totalBudget) * 100)
                                : 0,
                        },
                        milestones: {
                            total: project.milestones.length,
                            completed: completedMilestones,
                        },
                        outputs: project.outputs.length,
                        timeline: {
                            start: project.startDate,
                            end: project.endDate,
                        },
                    };
                }

                return {
                    itemNumber: item.itemNumber,
                    title: item.title,
                    type: item.type,
                    presenter: item.presenter,
                    duration: item.duration,
                    description: item.description,
                    projectStats,
                };
            }),
            generatedAt: new Date().toISOString(),
            generatedBy: `${req.user?.email}`,
        };

        res.json(meetingPack);
    } catch (error) {
        console.error('Generate meeting pack error:', error);
        res.status(500).json({ error: 'Failed to generate meeting pack' });
    }
};

// Get RC members
export const getRCMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // Static RC members based on SERC website
        const rcMembers = [
            { name: 'Shri. U.K. Bhattacharya', role: 'Chairman', organization: 'Director (Projects) (Retd.) NTPC Limited' },
            { name: 'Prof. Aparna Dey Ghosh', role: 'Member', organization: 'IIEST Shibpur' },
            { name: 'Shri. P.Y. Manjure', role: 'Member', organization: 'Freyssinet Prestressed Concrete Co. Ltd.' },
            { name: 'Shri. Y.T. Praveenchandra', role: 'Member', organization: 'NPCIL' },
            { name: 'Shri. C.Y. Shivaji', role: 'Member', organization: 'L&T ECC' },
            { name: 'Shri. Sumeet Singhal IRSE', role: 'Agency Representative', organization: 'Commission of Railway Safety' },
            { name: 'Prof. Manoranjan Parida', role: 'Sister Laboratory', organization: 'CSIR-CRRI' },
            { name: 'Dr. N. Anandavalli', role: 'Director', organization: 'CSIR-SERC' },
            { name: 'Mr. Mayank Mathur', role: 'DG\'s Representative', organization: 'CSIR HQ' },
            { name: 'Dr. MB Anoop', role: 'Secretary', organization: 'CSIR-SERC' },
            { name: 'Dr. Kanchana Devi A', role: 'Joint Secretary', organization: 'CSIR-SERC' },
        ];

        res.json(rcMembers);
    } catch (error) {
        console.error('Get RC members error:', error);
        res.status(500).json({ error: 'Failed to fetch RC members' });
    }
};
