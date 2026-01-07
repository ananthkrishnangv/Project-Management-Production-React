import { Router, Request, Response } from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/index.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);
const router = Router();

router.use(authenticate);

// Backup directory configuration
const BACKUP_DIR = process.env.BACKUP_DIR || '/opt/csir-serc-portal/backup';

// Ensure backup directory exists
const ensureBackupDir = async () => {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
};

// ============================================
// SMTP SETTINGS
// ============================================

const smtpSettingsSchema = z.object({
    host: z.string().min(1),
    port: z.number().int().positive(),
    user: z.string().min(1),
    pass: z.string().min(1),
    from: z.string().email(),
    secure: z.boolean().default(true),
});

router.get('/smtp', authorize('ADMIN'), async (req: Request, res: Response) => {
    try {
        const settings = await prisma.systemConfig.findMany({
            where: {
                key: {
                    startsWith: 'smtp_',
                },
            },
        });

        const smtpConfig: Record<string, string> = {};
        settings.forEach((s) => {
            const key = s.key.replace('smtp_', '');
            // Mask password
            if (key === 'pass') {
                smtpConfig[key] = '********';
            } else {
                smtpConfig[key] = s.value;
            }
        });

        res.json(smtpConfig);
    } catch (error) {
        console.error('Get SMTP settings error:', error);
        res.status(500).json({ error: 'Failed to fetch SMTP settings' });
    }
});

router.put('/smtp', authorize('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { host, port, user, pass, from, secure } = req.body;

        const validated = smtpSettingsSchema.parse({ host, port, user, pass, from, secure });

        const updates = [
            { key: 'smtp_host', value: validated.host },
            { key: 'smtp_port', value: String(validated.port) },
            { key: 'smtp_user', value: validated.user },
            { key: 'smtp_pass', value: validated.pass },
            { key: 'smtp_from', value: validated.from },
            { key: 'smtp_secure', value: String(validated.secure) },
        ];

        for (const { key, value } of updates) {
            await prisma.systemConfig.upsert({
                where: { key },
                create: { key, value, description: `SMTP ${key.replace('smtp_', '')} setting` },
                update: { value },
            });
        }

        // Log the change
        await prisma.auditLog.create({
            data: {
                userId: req.user?.userId,
                action: 'UPDATE',
                entity: 'SystemConfig',
                entityId: 'smtp_settings',
                newValue: { host, port, user, from, secure },
            },
        });

        res.json({ message: 'SMTP settings updated successfully' });
    } catch (error) {
        console.error('Update SMTP settings error:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid SMTP settings', details: error.errors });
            return;
        }
        res.status(500).json({ error: 'Failed to update SMTP settings' });
    }
});

// Test SMTP connection
router.post('/smtp/test', authorize('ADMIN'), async (req: Request, res: Response) => {
    try {
        const { testEmail } = req.body;

        if (!testEmail) {
            res.status(400).json({ error: 'Test email address is required' });
            return;
        }

        // Get SMTP settings
        const settings = await prisma.systemConfig.findMany({
            where: { key: { startsWith: 'smtp_' } },
        });

        if (settings.length < 4) {
            res.status(400).json({ error: 'SMTP settings not configured' });
            return;
        }

        // In production, this would send an actual test email
        // For now, we'll just validate the configuration exists
        res.json({ message: 'SMTP test initiated', testEmail });
    } catch (error) {
        console.error('Test SMTP error:', error);
        res.status(500).json({ error: 'Failed to test SMTP connection' });
    }
});

// ============================================
// PORTAL SETTINGS
// ============================================

router.get('/portal', authorize('ADMIN'), async (req: Request, res: Response) => {
    try {
        const settings = await prisma.systemConfig.findMany({
            where: {
                key: {
                    startsWith: 'portal_',
                },
            },
        });

        const portalConfig: Record<string, string> = {};
        settings.forEach((s) => {
            portalConfig[s.key.replace('portal_', '')] = s.value;
        });

        // Default values
        res.json({
            name: portalConfig.name || 'CSIR-SERC Project Management Portal',
            tagline: portalConfig.tagline || 'Central Structural Engineering Research Centre',
            primaryColor: portalConfig.primaryColor || '#0078d4',
            logoUrl: portalConfig.logoUrl || '/logo.png',
            ...portalConfig,
        });
    } catch (error) {
        console.error('Get portal settings error:', error);
        res.status(500).json({ error: 'Failed to fetch portal settings' });
    }
});

router.put('/portal', authorize('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, tagline, primaryColor, logoUrl } = req.body;

        const updates = [
            { key: 'portal_name', value: name },
            { key: 'portal_tagline', value: tagline },
            { key: 'portal_primaryColor', value: primaryColor },
            { key: 'portal_logoUrl', value: logoUrl },
        ].filter((u) => u.value !== undefined);

        for (const { key, value } of updates) {
            await prisma.systemConfig.upsert({
                where: { key },
                create: { key, value, description: `Portal ${key.replace('portal_', '')} setting` },
                update: { value },
            });
        }

        await prisma.auditLog.create({
            data: {
                userId: req.user?.userId,
                action: 'UPDATE',
                entity: 'SystemConfig',
                entityId: 'portal_settings',
                newValue: { name, tagline, primaryColor, logoUrl },
            },
        });

        res.json({ message: 'Portal settings updated successfully' });
    } catch (error) {
        console.error('Update portal settings error:', error);
        res.status(500).json({ error: 'Failed to update portal settings' });
    }
});

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

router.get('/notifications', authorize('ADMIN'), async (req: Request, res: Response) => {
    try {
        const settings = await prisma.systemConfig.findMany({
            where: {
                key: {
                    startsWith: 'notify_',
                },
            },
        });

        const notifyConfig: Record<string, boolean> = {};
        settings.forEach((s) => {
            notifyConfig[s.key.replace('notify_', '')] = s.value === 'true';
        });

        // Default notification settings
        res.json({
            deadlineAlerts: notifyConfig.deadlineAlerts ?? true,
            budgetWarnings: notifyConfig.budgetWarnings ?? true,
            mouExpiry: notifyConfig.mouExpiry ?? true,
            rcMeetings: notifyConfig.rcMeetings ?? true,
            projectUpdates: notifyConfig.projectUpdates ?? true,
            systemAlerts: notifyConfig.systemAlerts ?? true,
            emailNotifications: notifyConfig.emailNotifications ?? true,
            inAppNotifications: notifyConfig.inAppNotifications ?? true,
        });
    } catch (error) {
        console.error('Get notification settings error:', error);
        res.status(500).json({ error: 'Failed to fetch notification settings' });
    }
});

router.put('/notifications', authorize('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const settings = req.body;

        for (const [key, value] of Object.entries(settings)) {
            await prisma.systemConfig.upsert({
                where: { key: `notify_${key}` },
                create: {
                    key: `notify_${key}`,
                    value: String(value),
                    description: `Notification preference: ${key}`,
                },
                update: { value: String(value) },
            });
        }

        await prisma.auditLog.create({
            data: {
                userId: req.user?.userId,
                action: 'UPDATE',
                entity: 'SystemConfig',
                entityId: 'notification_settings',
                newValue: settings,
            },
        });

        res.json({ message: 'Notification settings updated successfully' });
    } catch (error) {
        console.error('Update notification settings error:', error);
        res.status(500).json({ error: 'Failed to update notification settings' });
    }
});

// ============================================
// BACKUP MANAGEMENT
// ============================================

router.get('/backups', authorize('ADMIN'), async (req: Request, res: Response) => {
    try {
        await ensureBackupDir();

        const files = fs.readdirSync(BACKUP_DIR);
        const backups = files
            .filter((f) => f.endsWith('.sql') || f.endsWith('.sql.gz') || f.endsWith('.tar.gz'))
            .map((f) => {
                const stats = fs.statSync(path.join(BACKUP_DIR, f));
                return {
                    name: f,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    type: f.includes('app') ? 'application' : 'database',
                };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Get backup schedule
        const scheduleConfig = await prisma.systemConfig.findUnique({
            where: { key: 'backup_schedule' },
        });

        res.json({
            backups,
            schedule: scheduleConfig?.value || 'daily',
        });
    } catch (error) {
        console.error('Get backups error:', error);
        res.status(500).json({ error: 'Failed to fetch backups' });
    }
});

router.post('/backups/create', authorize('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        await ensureBackupDir();

        const { type = 'database' } = req.body;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        let backupFile: string;
        let command: string;

        if (type === 'database') {
            backupFile = `db_backup_${timestamp}.sql.gz`;
            const dbUrl = process.env.DATABASE_URL || '';
            // Parse DATABASE_URL for pg_dump
            // Format: postgresql://user:pass@host:port/database
            const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
            const match = dbUrl.match(regex);

            if (match) {
                const [, user, password, host, port, database] = match;
                command = `PGPASSWORD='${password}' pg_dump -h ${host} -p ${port} -U ${user} ${database} | gzip > ${path.join(BACKUP_DIR, backupFile)}`;
            } else {
                res.status(500).json({ error: 'Invalid database URL configuration' });
                return;
            }
        } else {
            // Application backup - backup uploads and config
            backupFile = `app_backup_${timestamp}.tar.gz`;
            const appDir = process.env.APP_DIR || '/opt/csir-serc-portal';
            command = `tar -czf ${path.join(BACKUP_DIR, backupFile)} -C ${appDir} uploads .env`;
        }

        await execAsync(command);

        await prisma.auditLog.create({
            data: {
                userId: req.user?.userId,
                action: 'CREATE',
                entity: 'Backup',
                entityId: backupFile,
                newValue: { type, file: backupFile },
            },
        });

        res.json({
            message: `${type} backup created successfully`,
            file: backupFile,
        });
    } catch (error) {
        console.error('Create backup error:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

router.post('/backups/restore', authorize('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { fileName } = req.body;

        if (!fileName) {
            res.status(400).json({ error: 'Backup file name is required' });
            return;
        }

        const backupPath = path.join(BACKUP_DIR, fileName);

        if (!fs.existsSync(backupPath)) {
            res.status(404).json({ error: 'Backup file not found' });
            return;
        }

        // For security, we don't auto-restore, just validate the file exists
        // Actual restore should be done manually or with explicit confirmation

        await prisma.auditLog.create({
            data: {
                userId: req.user?.userId,
                action: 'RESTORE_REQUEST',
                entity: 'Backup',
                entityId: fileName,
                newValue: { fileName, status: 'requested' },
            },
        });

        res.json({
            message: 'Restore request logged. Manual restore required for safety.',
            file: fileName,
            command: fileName.endsWith('.sql.gz')
                ? `gunzip -c ${backupPath} | psql $DATABASE_URL`
                : `tar -xzf ${backupPath} -C /opt/csir-serc-portal`,
        });
    } catch (error) {
        console.error('Restore backup error:', error);
        res.status(500).json({ error: 'Failed to process restore request' });
    }
});

router.delete('/backups/:fileName', authorize('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { fileName } = req.params;
        const backupPath = path.join(BACKUP_DIR, fileName);

        if (!fs.existsSync(backupPath)) {
            res.status(404).json({ error: 'Backup file not found' });
            return;
        }

        fs.unlinkSync(backupPath);

        await prisma.auditLog.create({
            data: {
                userId: req.user?.userId,
                action: 'DELETE',
                entity: 'Backup',
                entityId: fileName,
            },
        });

        res.json({ message: 'Backup deleted successfully' });
    } catch (error) {
        console.error('Delete backup error:', error);
        res.status(500).json({ error: 'Failed to delete backup' });
    }
});

router.put('/backups/schedule', authorize('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { schedule } = req.body; // 'daily', 'weekly', 'monthly', 'disabled'

        const validSchedules = ['daily', 'weekly', 'monthly', 'disabled'];
        if (!validSchedules.includes(schedule)) {
            res.status(400).json({ error: 'Invalid schedule. Use: daily, weekly, monthly, or disabled' });
            return;
        }

        await prisma.systemConfig.upsert({
            where: { key: 'backup_schedule' },
            create: { key: 'backup_schedule', value: schedule, description: 'Automatic backup schedule' },
            update: { value: schedule },
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user?.userId,
                action: 'UPDATE',
                entity: 'SystemConfig',
                entityId: 'backup_schedule',
                newValue: { schedule },
            },
        });

        res.json({ message: `Backup schedule set to ${schedule}` });
    } catch (error) {
        console.error('Update backup schedule error:', error);
        res.status(500).json({ error: 'Failed to update backup schedule' });
    }
});

export default router;
