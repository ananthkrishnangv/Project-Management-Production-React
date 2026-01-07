import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import prisma from '../config/database.js';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
}

export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}

export const authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Access token required' });
            return;
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

            // Verify user still exists and is active
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, isActive: true, role: true },
            });

            if (!user || !user.isActive) {
                res.status(401).json({ error: 'User not found or inactive' });
                return;
            }

            req.user = decoded;
            next();
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                res.status(401).json({ error: 'Token expired' });
                return;
            }
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

export const authorize = (...roles: UserRole[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                error: 'Access denied',
                message: `This action requires one of the following roles: ${roles.join(', ')}`
            });
            return;
        }

        next();
    };
};

export const optionalAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
                req.user = decoded;
            } catch {
                // Token invalid, continue without user
            }
        }

        next();
    } catch (error) {
        next();
    }
};

/**
 * Middleware to check if user has access to a specific project
 * Should be used on routes with :id or :projectId parameter
 */
export const requireProjectMembership = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const projectId = req.params.id || req.params.projectId;
        if (!projectId) {
            res.status(400).json({ error: 'Project ID required' });
            return;
        }

        // Full access roles bypass this check
        const fullAccessRoles: UserRole[] = ['ADMIN', 'SUPERVISOR', 'DIRECTOR', 'DIRECTOR_GENERAL'];
        if (fullAccessRoles.includes(user.role)) {
            next();
            return;
        }

        // Check if project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
                id: true,
                projectHeadId: true,
                staff: {
                    where: { userId: user.userId, isActive: true },
                    select: { id: true },
                },
            },
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Check membership
        const isProjectHead = project.projectHeadId === user.userId;
        const isStaffMember = project.staff.length > 0;
        const isRCMember = user.role === 'RC_MEMBER'; // RC members can view for review

        if (!isProjectHead && !isStaffMember && !isRCMember) {
            res.status(403).json({
                error: 'Access denied',
                message: 'You are not a member of this project',
            });
            return;
        }

        next();
    } catch (error) {
        console.error('Project membership check error:', error);
        res.status(500).json({ error: 'Access check failed' });
    }
};
