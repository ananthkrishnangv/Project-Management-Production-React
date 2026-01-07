import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { AuthenticatedRequest } from './auth.middleware.js';

export interface AuditInfo {
    action: string;
    entity: string;
    entityId?: string;
    oldValue?: object;
    newValue?: object;
}

export const auditLog = (info: AuditInfo) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        const originalSend = res.send;

        res.send = function (body) {
            // Only log successful operations
            if (res.statusCode >= 200 && res.statusCode < 300) {
                prisma.auditLog.create({
                    data: {
                        userId: req.user?.userId,
                        action: info.action,
                        entity: info.entity,
                        entityId: info.entityId || req.params?.id,
                        oldValue: info.oldValue,
                        newValue: typeof body === 'string' ? JSON.parse(body) : body,
                        ipAddress: req.ip || req.socket.remoteAddress,
                        userAgent: req.headers['user-agent'],
                    },
                }).catch(console.error);
            }
            return originalSend.call(this, body);
        };

        next();
    };
};

export const createAuditLog = async (
    userId: string | undefined,
    action: string,
    entity: string,
    entityId?: string,
    oldValue?: object,
    newValue?: object,
    req?: Request
): Promise<void> => {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                entity,
                entityId,
                oldValue: oldValue ? oldValue : undefined,
                newValue: newValue ? newValue : undefined,
                ipAddress: req?.ip || req?.socket.remoteAddress,
                userAgent: req?.headers['user-agent'],
            },
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
};
