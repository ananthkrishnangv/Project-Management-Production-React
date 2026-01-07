import { Response } from 'express';
import prisma from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { calculateFileHash } from '../utils/helpers.js';
import { createAuditLog } from '../middleware/audit.middleware.js';
import { notificationService } from '../services/notification.service.js';
import { DocumentType } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';
import QRCode from 'qrcode';
import { z } from 'zod';

// Get documents
export const getDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { projectId, type, page = '1', limit = '20' } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        const where: any = {};
        if (projectId) where.projectId = projectId;
        if (type) where.type = type;

        const [documents, total] = await Promise.all([
            prisma.document.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                include: {
                    project: { select: { code: true, title: true } },
                    uploadedBy: { select: { firstName: true, lastName: true } },
                },
            }),
            prisma.document.count({ where }),
        ]);

        res.json({
            data: documents,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
};

// Upload document
export const uploadDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const { projectId, type, title, description } = req.body;

        if (!type || !title) {
            res.status(400).json({ error: 'Type and title are required' });
            return;
        }

        // Calculate file hash
        const sha256Hash = await calculateFileHash(req.file.path);

        const document = await prisma.document.create({
            data: {
                projectId: projectId || null,
                uploadedById: req.user!.userId,
                type: type as DocumentType,
                title,
                description,
                fileName: req.file.originalname,
                filePath: req.file.path,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                sha256Hash,
            },
        });

        await createAuditLog(
            req.user?.userId,
            'UPLOAD',
            'Document',
            document.id,
            undefined,
            { title: document.title, type: document.type },
            req
        );

        res.status(201).json(document);
    } catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({ error: 'Failed to upload document' });
    }
};

// Download document
export const downloadDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const document = await prisma.document.findUnique({
            where: { id },
        });

        if (!document) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }

        if (!fs.existsSync(document.filePath)) {
            res.status(404).json({ error: 'File not found on server' });
            return;
        }

        res.download(document.filePath, document.fileName);
    } catch (error) {
        console.error('Download document error:', error);
        res.status(500).json({ error: 'Failed to download document' });
    }
};

// Delete document
export const deleteDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const document = await prisma.document.findUnique({
            where: { id },
        });

        if (!document) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }

        // Delete file from disk
        if (fs.existsSync(document.filePath)) {
            fs.unlinkSync(document.filePath);
        }

        await prisma.document.delete({
            where: { id },
        });

        await createAuditLog(
            req.user?.userId,
            'DELETE',
            'Document',
            id,
            { title: document.title },
            undefined,
            req
        );

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
};

// Get MoUs
export const getMoUs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { projectId, expiring } = req.query;

        const where: any = { isActive: true };
        if (projectId) where.projectId = projectId;

        if (expiring === 'true') {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            where.expiryDate = {
                gte: new Date(),
                lte: thirtyDaysFromNow,
            };
        }

        const mous = await prisma.moU.findMany({
            where,
            include: {
                project: { select: { code: true, title: true } },
            },
            orderBy: { expiryDate: 'asc' },
        });

        res.json(mous);
    } catch (error) {
        console.error('Get MoUs error:', error);
        res.status(500).json({ error: 'Failed to fetch MoUs' });
    }
};

// Create MoU
export const createMoU = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { projectId, partnerName, partnerType, title, description, signedDate, expiryDate } = req.body;

        let documentPath: string | undefined;
        if (req.file) {
            documentPath = req.file.path;
        }

        const mou = await prisma.moU.create({
            data: {
                projectId,
                partnerName,
                partnerType,
                title,
                description,
                signedDate: new Date(signedDate),
                expiryDate: new Date(expiryDate),
                documentPath,
            },
        });

        await createAuditLog(
            req.user?.userId,
            'CREATE',
            'MoU',
            mou.id,
            undefined,
            { title: mou.title, partner: mou.partnerName },
            req
        );

        res.status(201).json(mou);
    } catch (error) {
        console.error('Create MoU error:', error);
        res.status(500).json({ error: 'Failed to create MoU' });
    }
};

// Get project outputs
export const getProjectOutputs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { projectId, type } = req.query;

        const where: any = {};
        if (projectId) where.projectId = projectId;
        if (type) where.type = type;

        const outputs = await prisma.projectOutput.findMany({
            where,
            include: {
                project: { select: { code: true, title: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Group by type
        const byType = outputs.reduce((acc, o) => {
            if (!acc[o.type]) acc[o.type] = [];
            acc[o.type].push(o);
            return acc;
        }, {} as Record<string, typeof outputs>);

        res.json({
            outputs,
            byType,
            total: outputs.length,
        });
    } catch (error) {
        console.error('Get project outputs error:', error);
        res.status(500).json({ error: 'Failed to fetch outputs' });
    }
};

// Add project output
export const addProjectOutput = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { projectId, type, title, description, authors, publishedIn, publishedDate, doi, url } = req.body;

        let attachmentPath: string | undefined;
        if (req.file) {
            attachmentPath = req.file.path;
        }

        const output = await prisma.projectOutput.create({
            data: {
                projectId,
                type,
                title,
                description,
                authors,
                publishedIn,
                publishedDate: publishedDate ? new Date(publishedDate) : undefined,
                doi,
                url,
                attachmentPath,
            },
        });

        await createAuditLog(
            req.user?.userId,
            'CREATE',
            'ProjectOutput',
            output.id,
            undefined,
            { title: output.title, type: output.type },
            req
        );

        res.status(201).json(output);
    } catch (error) {
        console.error('Add project output error:', error);
        res.status(500).json({ error: 'Failed to add output' });
    }
};

// Generate QR code for asset
export const generateAssetQR = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { assetName, projectId, purchaseDate, cost, depreciation } = req.body;

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { code: true, title: true },
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const assetData = {
            asset: assetName,
            project: project.code,
            projectTitle: project.title,
            purchased: purchaseDate,
            cost: cost,
            depreciation: depreciation,
            generatedAt: new Date().toISOString(),
        };

        const qrDataUrl = await QRCode.toDataURL(JSON.stringify(assetData), {
            width: 300,
            margin: 2,
            color: {
                dark: '#004578',
                light: '#ffffff',
            },
        });

        res.json({
            qrCode: qrDataUrl,
            assetData,
        });
    } catch (error) {
        console.error('Generate asset QR error:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
};

// External feedback
export const submitExternalFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { projectId, rating, feedback } = req.body;

        let certificatePath: string | undefined;
        if (req.file) {
            certificatePath = req.file.path;
        }

        const feedbackRecord = await prisma.externalFeedback.create({
            data: {
                projectId,
                externalUserId: req.user!.userId,
                rating,
                feedback,
                certificatePath,
            },
        });

        // Notify project head
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { projectHeadId: true, title: true },
        });

        if (project) {
            await notificationService.createNotification({
                userId: project.projectHeadId,
                type: 'PROJECT_UPDATE',
                title: 'New External Feedback',
                message: `External feedback received for project "${project.title}"`,
                link: `/projects/${projectId}`,
                sendEmail: true,
            });
        }

        res.status(201).json(feedbackRecord);
    } catch (error) {
        console.error('Submit feedback error:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
};

// Get external feedback for a project
export const getExternalFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;

        const feedback = await prisma.externalFeedback.findMany({
            where: { projectId },
            orderBy: { submittedAt: 'desc' },
        });

        res.json(feedback);
    } catch (error) {
        console.error('Get feedback error:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
};
