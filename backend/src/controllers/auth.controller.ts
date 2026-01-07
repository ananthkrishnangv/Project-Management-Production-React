import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import prisma from '../config/database.js';
import config from '../config/index.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../middleware/audit.middleware.js';
import { z } from 'zod';

// Validation schemas
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    designation: z.string().optional(),
    phone: z.string().optional(),
    role: z.enum(['ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD', 'EMPLOYEE', 'EXTERNAL_OWNER']).optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
    twoFactorCode: z.string().optional(),
});

// Generate tokens
const generateTokens = (userId: string, email: string, role: string) => {
    const accessToken = jwt.sign(
        { userId, email, role },
        config.jwt.accessSecret,
        { expiresIn: config.jwt.accessExpiry } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
        { userId },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiry } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
};

// Register new user (admin only)
export const register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const data = registerSchema.parse(req.body);

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            res.status(400).json({ error: 'User with this email already exists' });
            return;
        }

        // Hash password
        const hashedPassword = await argon2.hash(data.password);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                firstName: data.firstName,
                lastName: data.lastName,
                designation: data.designation,
                phone: data.phone,
                role: data.role || 'EMPLOYEE',
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                createdAt: true,
            },
        });

        await createAuditLog(req.user?.userId, 'CREATE', 'User', user.id, undefined, { email: user.email }, req);

        res.status(201).json({
            message: 'User created successfully',
            user,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Register error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

// Login
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = loginSchema.parse(req.body);

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        if (!user.isActive) {
            res.status(401).json({ error: 'Account is deactivated' });
            return;
        }

        // Verify password
        const validPassword = await argon2.verify(user.password, data.password);
        if (!validPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Check 2FA if enabled
        if (user.twoFactorEnabled) {
            if (!data.twoFactorCode) {
                res.status(200).json({
                    requiresTwoFactor: true,
                    message: 'Two-factor authentication required'
                });
                return;
            }

            const isValid = authenticator.verify({
                token: data.twoFactorCode,
                secret: user.twoFactorSecret!,
            });

            if (!isValid) {
                res.status(401).json({ error: 'Invalid 2FA code' });
                return;
            }
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

        // Store refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt,
            },
        });

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });

        await createAuditLog(user.id, 'LOGIN', 'User', user.id, undefined, undefined, req);

        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                designation: user.designation,
                profileImage: user.profileImage,
                twoFactorEnabled: user.twoFactorEnabled,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            res.status(400).json({ error: 'Refresh token required' });
            return;
        }

        // Verify token exists and is valid
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
            res.status(401).json({ error: 'Invalid or expired refresh token' });
            return;
        }

        // Verify JWT
        try {
            jwt.verify(token, config.jwt.refreshSecret);
        } catch {
            res.status(401).json({ error: 'Invalid refresh token' });
            return;
        }

        // Delete old refresh token
        await prisma.refreshToken.delete({
            where: { id: storedToken.id },
        });

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(
            storedToken.user.id,
            storedToken.user.email,
            storedToken.user.role
        );

        // Store new refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await prisma.refreshToken.create({
            data: {
                token: newRefreshToken,
                userId: storedToken.user.id,
                expiresAt,
            },
        });

        res.json({
            accessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ error: 'Token refresh failed' });
    }
};

// Logout
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { refreshToken: token } = req.body;

        if (token) {
            await prisma.refreshToken.deleteMany({
                where: { token },
            });
        }

        await createAuditLog(req.user?.userId, 'LOGOUT', 'User', req.user?.userId, undefined, undefined, req);

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
};

// Setup 2FA
export const setup2FA = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Generate secret
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(user.email, config.twoFa.issuer, secret);

        // Generate QR code
        const qrCode = await QRCode.toDataURL(otpauth);

        // Store secret (not enabled yet)
        await prisma.user.update({
            where: { id: userId },
            data: { twoFactorSecret: secret },
        });

        res.json({
            secret,
            qrCode,
            message: 'Scan the QR code with your authenticator app, then verify to enable 2FA',
        });
    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({ error: '2FA setup failed' });
    }
};

// Verify and enable 2FA
export const verify2FA = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { code } = req.body;

        if (!code) {
            res.status(400).json({ error: 'Verification code required' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.twoFactorSecret) {
            res.status(400).json({ error: '2FA not set up' });
            return;
        }

        const isValid = authenticator.verify({
            token: code,
            secret: user.twoFactorSecret,
        });

        if (!isValid) {
            res.status(400).json({ error: 'Invalid verification code' });
            return;
        }

        // Enable 2FA
        await prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true },
        });

        await createAuditLog(userId, 'ENABLE_2FA', 'User', userId, undefined, undefined, req);

        res.json({ message: '2FA enabled successfully' });
    } catch (error) {
        console.error('2FA verify error:', error);
        res.status(500).json({ error: '2FA verification failed' });
    }
};

// Disable 2FA
export const disable2FA = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { password } = req.body;

        if (!password) {
            res.status(400).json({ error: 'Password required' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const validPassword = await argon2.verify(user.password, password);
        if (!validPassword) {
            res.status(401).json({ error: 'Invalid password' });
            return;
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
            },
        });

        await createAuditLog(userId, 'DISABLE_2FA', 'User', userId, undefined, undefined, req);

        res.json({ message: '2FA disabled successfully' });
    } catch (error) {
        console.error('2FA disable error:', error);
        res.status(500).json({ error: '2FA disable failed' });
    }
};

// Get current user
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                designation: true,
                phone: true,
                role: true,
                profileImage: true,
                twoFactorEnabled: true,
                lastLogin: true,
                createdAt: true,
            },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json(user);
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
};

// Change password
export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ error: 'Current and new passwords required' });
            return;
        }

        if (newPassword.length < 8) {
            res.status(400).json({ error: 'New password must be at least 8 characters' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const validPassword = await argon2.verify(user.password, currentPassword);
        if (!validPassword) {
            res.status(401).json({ error: 'Current password is incorrect' });
            return;
        }

        const hashedPassword = await argon2.hash(newPassword);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        // Invalidate all refresh tokens
        await prisma.refreshToken.deleteMany({
            where: { userId },
        });

        await createAuditLog(userId, 'CHANGE_PASSWORD', 'User', userId, undefined, undefined, req);

        res.json({ message: 'Password changed successfully. Please login again.' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};
