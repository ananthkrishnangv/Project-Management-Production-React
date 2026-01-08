import { Router, Request, Response } from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/index.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import argon2 from 'argon2';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

// Get all users (admin only)
router.get('/', authorize('ADMIN', 'DIRECTOR', 'SUPERVISOR'), async (req: Request, res: Response) => {
    try {
        const { role, search, active } = req.query;

        const where: any = {};
        if (role) where.role = role;
        if (active !== undefined) where.isActive = active === 'true';
        if (search) {
            where.OR = [
                { firstName: { contains: search as string, mode: 'insensitive' } },
                { lastName: { contains: search as string, mode: 'insensitive' } },
                { email: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                designation: true,
                phone: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                _count: {
                    select: {
                        projectsHeaded: true,
                        projectMembership: true,
                    },
                },
            },
            orderBy: { firstName: 'asc' },
        });

        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get single user
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                designation: true,
                phone: true,
                role: true,
                isActive: true,
                profileImage: true,
                lastLogin: true,
                createdAt: true,
                projectsHeaded: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        status: true,
                    },
                },
                projectMembership: {
                    where: { isActive: true },
                    include: {
                        project: {
                            select: {
                                id: true,
                                code: true,
                                title: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Update user
router.put('/:id', authorize('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, designation, phone, role, isActive } = req.body;

        const user = await prisma.user.update({
            where: { id },
            data: {
                firstName,
                lastName,
                designation,
                phone,
                role,
                isActive,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                designation: true,
                role: true,
                isActive: true,
            },
        });

        res.json(user);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Reset user password (admin only)
router.post('/:id/reset-password', authorize('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            res.status(400).json({ error: 'Password must be at least 8 characters' });
            return;
        }

        const hashedPassword = await argon2.hash(newPassword);

        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword },
        });

        // Invalidate all refresh tokens
        await prisma.refreshToken.deleteMany({
            where: { userId: id },
        });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Get scientists (from SERC)
router.get('/serc/scientists', async (req: Request, res: Response) => {
    try {
        // Static list based on SERC website
        const scientists = [
            { name: 'Dr Anandavalli N', designation: 'Director', url: 'https://serc.res.in/dr-anandavalli-n' },
            { name: 'Dr Sathish Kumar K', designation: 'Chief Scientist', url: 'https://serc.res.in/dr-sathish-kumar-k' },
            { name: 'Dr Pabbisetty Harikrishna', designation: 'Chief Scientist', url: 'https://serc.res.in/dr-pabbisetty-harikrishna' },
            { name: 'Dr Parivallal S', designation: 'Chief Scientist', url: 'https://serc.res.in/dr-parivallal-s' },
            { name: 'Dr Prabakar J', designation: 'Chief Scientist', url: 'https://serc.res.in/dr-prabakar-j' },
            { name: 'Dr Bhaskar S', designation: 'Chief Scientist', url: 'https://serc.res.in/dr-bhaskar-s' },
            { name: 'Dr Ing. Saptarshi Sasmal', designation: 'Chief Scientist', url: 'https://serc.res.in/dr-ing-saptarshi-sasmal' },
            { name: 'Dr Anoop M.B', designation: 'Chief Scientist', url: 'https://serc.res.in/dr-anoop-mb' },
            { name: 'Dr Ramachandra Murthy A', designation: 'Chief Scientist', url: 'https://serc.res.in/dr-ramachandra-murthy-profile' },
            { name: 'Dr Srinivas V', designation: 'Chief Scientist', url: 'https://serc.res.in/dr-srinivas-v' },
            { name: 'Dr Kamatchi P', designation: 'Chief Scientist', url: 'https://serc.res.in/dr-kamatchi-p-profile' },
            { name: 'Ms Sreekala R', designation: 'Chief Scientist', url: 'https://serc.res.in/ms-sreekala-r' },
            { name: 'Mr Remesh Babu Gajjala', designation: 'Chief Scientist', url: 'https://serc.res.in/mr-remesh-babu-gajjala' },
            { name: 'Dr Maheswaran S', designation: 'Senior Principal Scientist', url: 'https://serc.res.in/dr-maheswaran-s' },
            { name: 'Dr Rajendra Pitambar Rokade', designation: 'Senior Principal Scientist', url: 'https://serc.res.in/mr-rajendra-pitambar-rokade-profile' },
            { name: 'Dr Amar Prakash', designation: 'Senior Principal Scientist', url: 'https://serc.res.in/dr-amar-prakash-profile' },
            { name: 'Dr. Smitha Gopinath', designation: 'Senior Principal Scientist', url: 'https://serc.res.in/dr-smitha-gopinath-profile' },
            { name: 'Dr Abraham A', designation: 'Senior Principal Scientist', url: 'https://serc.res.in/dr-abraham' },
            { name: 'Dr Vishnuvardhan S', designation: 'Senior Principal Scientist', url: 'https://serc.res.in/dr-vishnuvardhan-s' },
            { name: 'Dr Lakshmi K', designation: 'Senior Principal Scientist', url: 'https://serc.res.in/dr-lakshmi-k' },
            { name: 'Dr Marimuthu V', designation: 'Senior Principal Scientist', url: 'https://serc.res.in/dr-marimuthu-v' },
        ];

        res.json(scientists);
    } catch (error) {
        console.error('Get scientists error:', error);
        res.status(500).json({ error: 'Failed to fetch scientists' });
    }
});

// Self-service password change
router.post('/change-password', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ error: 'Current and new password are required' });
            return;
        }

        if (newPassword.length < 8) {
            res.status(400).json({ error: 'New password must be at least 8 characters' });
            return;
        }

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Verify current password
        const isValid = await argon2.verify(user.password, currentPassword);
        if (!isValid) {
            res.status(401).json({ error: 'Current password is incorrect' });
            return;
        }

        // Hash and update new password
        const hashedPassword = await argon2.hash(newPassword);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        // Invalidate all refresh tokens
        await prisma.refreshToken.deleteMany({
            where: { userId },
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Self-service profile update (current user)
router.put('/profile', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { firstName, lastName, phone, mobileNumber, landlineNumber, whatsappNumber, designation, bio, department } = req.body;

        // Validate input
        const updateSchema = z.object({
            firstName: z.string().min(1).max(100).optional(),
            lastName: z.string().min(1).max(100).optional(),
            phone: z.string().max(20).optional().nullable(),
            mobileNumber: z.string().max(20).optional().nullable(),
            landlineNumber: z.string().max(20).optional().nullable(),
            whatsappNumber: z.string().max(20).optional().nullable(),
            designation: z.string().max(100).optional().nullable(),
            bio: z.string().max(2000).optional().nullable(),
            department: z.string().max(50).optional().nullable(),
        });

        const validatedData = updateSchema.parse({
            firstName, lastName, phone, mobileNumber, landlineNumber, whatsappNumber, designation, bio, department
        });

        const user = await prisma.user.update({
            where: { id: userId },
            data: validatedData,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                designation: true,
                phone: true,
                mobileNumber: true,
                landlineNumber: true,
                whatsappNumber: true,
                bio: true,
                department: true,
                role: true,
                profileImage: true,
                lastLogin: true,
                createdAt: true,
            },
        });

        // Log the change
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'UPDATE',
                entity: 'User',
                entityId: userId,
                newValue: validatedData,
            },
        });

        res.json(user);
    } catch (error) {
        console.error('Update profile error:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid input data', details: error.errors });
            return;
        }
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Get current user profile with projects and documents
router.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                designation: true,
                phone: true,
                mobileNumber: true,
                landlineNumber: true,
                whatsappNumber: true,
                alternateEmail: true,
                bio: true,
                department: true,
                employeeId: true,
                role: true,
                profileImage: true,
                isActive: true,
                twoFactorEnabled: true,
                lastLogin: true,
                createdAt: true,
                projectsHeaded: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        status: true,
                        category: true,
                        startDate: true,
                        endDate: true,
                        progress: true,
                    },
                    orderBy: { updatedAt: 'desc' },
                },
                projectMembership: {
                    where: { isActive: true },
                    include: {
                        project: {
                            select: {
                                id: true,
                                code: true,
                                title: true,
                                status: true,
                                category: true,
                            },
                        },
                    },
                },
                documentsUploaded: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        type: true,
                        fileName: true,
                        fileSize: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Get recent login activity
        const recentLogins = await prisma.auditLog.findMany({
            where: {
                userId,
                action: 'LOGIN',
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                createdAt: true,
                ipAddress: true,
                userAgent: true,
            },
        });

        res.json({
            ...user,
            recentLogins,
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Upload profile image
router.post('/profile/image', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const file = (req as any).file;

        if (!file) {
            res.status(400).json({ error: 'No image file provided' });
            return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' });
            return;
        }

        // Store relative path to the uploaded file
        const imagePath = `/uploads/profiles/${file.filename}`;

        const user = await prisma.user.update({
            where: { id: userId },
            data: { profileImage: imagePath },
            select: {
                id: true,
                profileImage: true,
            },
        });

        res.json({ message: 'Profile image updated', profileImage: user.profileImage });
    } catch (error) {
        console.error('Upload profile image error:', error);
        res.status(500).json({ error: 'Failed to upload profile image' });
    }
});

export default router;
