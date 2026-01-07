// Bulk Import/Export Routes
// Handles CSV/Excel import for users and projects

import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import argon2 from 'argon2';
import prisma from '../config/database.js';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../middleware/audit.middleware.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'imports');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.csv', '.xlsx', '.xls'].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV and Excel files are allowed'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.use(authenticate);

// Helper function to parse CSV
function parseCSV(content: string): Record<string, string>[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase().replace(/\s+/g, '_'));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
        });
        rows.push(row);
    }

    return rows;
}

// Map designation to role
function mapDesignationToRole(designation: string): string {
    const d = designation.toLowerCase();

    if (d.includes('director') && !d.includes('deputy')) return 'DIRECTOR';
    if (d.includes('head') && d.includes('bkmd')) return 'SUPERVISOR';
    if (d.includes('chief scientist')) return 'SUPERVISOR';
    if (d.includes('principal scientist')) return 'PROJECT_HEAD';
    if (d.includes('senior principal scientist')) return 'PROJECT_HEAD';
    if (d.includes('scientist')) return 'PROJECT_HEAD';

    return 'EMPLOYEE';
}

// POST /api/import/users - Bulk import users from CSV
router.post('/users', authorize('ADMIN', 'SUPERVISOR'), upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const content = fs.readFileSync(req.file.path, 'utf-8');
        const rows = parseCSV(content);

        if (rows.length === 0) {
            res.status(400).json({ error: 'No data found in file' });
            return;
        }

        const defaultPassword = await argon2.hash('SERC@2025!');
        const results = {
            imported: 0,
            skipped: 0,
            errors: [] as string[],
        };

        for (const row of rows) {
            try {
                const email = row.email || row.email_id || row.e_mail;
                const firstName = row.first_name || row.firstname || row.name?.split(' ')[0] || '';
                const lastName = row.last_name || row.lastname || row.name?.split(' ').slice(1).join(' ') || '';
                const designation = row.designation || row.title || '';
                const phone = row.phone || row.mobile || row.contact || '';

                if (!email || !email.includes('@')) {
                    results.errors.push(`Invalid email: ${email}`);
                    results.skipped++;
                    continue;
                }

                // Check if user exists
                const existing = await prisma.user.findUnique({ where: { email } });
                if (existing) {
                    results.errors.push(`User already exists: ${email}`);
                    results.skipped++;
                    continue;
                }

                const role = mapDesignationToRole(designation);

                await prisma.user.create({
                    data: {
                        email: email.toLowerCase(),
                        password: defaultPassword,
                        firstName: firstName || 'User',
                        lastName: lastName || email.split('@')[0],
                        designation,
                        phone,
                        role: role as any,
                        isActive: true,
                    },
                });

                results.imported++;
            } catch (err: any) {
                results.errors.push(`Error processing row: ${JSON.stringify(row).slice(0, 100)} - ${err.message}`);
                results.skipped++;
            }
        }

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        await createAuditLog(req.user?.userId, 'BULK_IMPORT', 'User', undefined, undefined, {
            imported: results.imported,
            skipped: results.skipped
        }, req);

        res.json({
            message: `Import completed. ${results.imported} users imported, ${results.skipped} skipped.`,
            ...results,
        });
    } catch (error: any) {
        console.error('User import error:', error);
        res.status(500).json({ error: 'Failed to import users', details: error.message });
    }
});

// POST /api/import/projects - Bulk import projects from CSV
router.post('/projects', authorize('ADMIN', 'SUPERVISOR'), upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const content = fs.readFileSync(req.file.path, 'utf-8');
        const rows = parseCSV(content);

        if (rows.length === 0) {
            res.status(400).json({ error: 'No data found in file' });
            return;
        }

        // Get default vertical or create one
        let defaultVertical = await prisma.vertical.findFirst();
        if (!defaultVertical) {
            defaultVertical = await prisma.vertical.create({
                data: { name: 'General', code: 'GEN', description: 'General projects' },
            });
        }

        // Get default project head (supervisor or admin)
        const defaultHead = await prisma.user.findFirst({
            where: { role: { in: ['SUPERVISOR', 'ADMIN', 'PROJECT_HEAD'] }, isActive: true },
        });

        if (!defaultHead) {
            res.status(400).json({ error: 'No project head available. Please create users first.' });
            return;
        }

        const results = {
            imported: 0,
            skipped: 0,
            errors: [] as string[],
        };

        for (const row of rows) {
            try {
                const title = row.title || row.project_title || row.name || '';
                const code = row.code || row.project_code || '';
                const description = row.description || row.objective || '';
                const category = (row.category || row.type || 'GAP').toUpperCase();
                const startDate = row.start_date || row.startdate || new Date().toISOString();
                const endDate = row.end_date || row.enddate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
                const status = (row.status || 'ACTIVE').toUpperCase();

                if (!title) {
                    results.errors.push(`Missing title in row`);
                    results.skipped++;
                    continue;
                }

                // Generate code if not provided
                const projectCode = code || `${category}-${new Date().getFullYear()}-${String(results.imported + 1).padStart(3, '0')}`;

                // Check if project code exists
                const existing = await prisma.project.findUnique({ where: { code: projectCode } });
                if (existing) {
                    results.errors.push(`Project code already exists: ${projectCode}`);
                    results.skipped++;
                    continue;
                }

                // Find project head by email if provided
                let projectHeadId = defaultHead.id;
                if (row.project_head_email || row.pi_email) {
                    const head = await prisma.user.findUnique({
                        where: { email: (row.project_head_email || row.pi_email).toLowerCase() },
                    });
                    if (head) projectHeadId = head.id;
                }

                await prisma.project.create({
                    data: {
                        code: projectCode,
                        title,
                        description,
                        category: ['GAP', 'CNP', 'OLP', 'EFP'].includes(category) ? category as any : 'GAP',
                        verticalId: defaultVertical.id,
                        projectHeadId,
                        status: ['ACTIVE', 'COMPLETED', 'ON_HOLD', 'PENDING_APPROVAL'].includes(status) ? status as any : 'ACTIVE',
                        startDate: new Date(startDate),
                        endDate: new Date(endDate),
                    },
                });

                results.imported++;
            } catch (err: any) {
                results.errors.push(`Error: ${err.message}`);
                results.skipped++;
            }
        }

        fs.unlinkSync(req.file.path);

        await createAuditLog(req.user?.userId, 'BULK_IMPORT', 'Project', undefined, undefined, {
            imported: results.imported,
            skipped: results.skipped
        }, req);

        res.json({
            message: `Import completed. ${results.imported} projects imported, ${results.skipped} skipped.`,
            ...results,
        });
    } catch (error: any) {
        console.error('Project import error:', error);
        res.status(500).json({ error: 'Failed to import projects', details: error.message });
    }
});

// GET /api/import/template/users - Download user import template
router.get('/template/users', authorize('ADMIN', 'SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const template = `email,first_name,last_name,designation,phone
john.doe@serc.res.in,John,Doe,Senior Scientist,+91 9876543210
jane.smith@serc.res.in,Jane,Smith,Principal Scientist,+91 9876543211
bob.kumar@serc.res.in,Bob,Kumar,Technical Officer,+91 9876543212`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=user_import_template.csv');
    res.send(template);
});

// GET /api/import/template/projects - Download project import template
router.get('/template/projects', authorize('ADMIN', 'SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const template = `code,title,description,category,start_date,end_date,status,project_head_email
GAP-2025-001,Wind Load Assessment Study,Assessment of wind loads on tall buildings,GAP,2025-01-01,2026-12-31,ACTIVE,scientist@serc.res.in
CNP-2025-001,Bridge Structural Analysis,Consultancy for bridge design,CNP,2025-02-01,2025-08-31,ACTIVE,pi@serc.res.in
EFP-2025-001,External Research Grant,Externally funded research project,EFP,2025-01-15,2027-01-14,ACTIVE,head@serc.res.in`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=project_import_template.csv');
    res.send(template);
});

// GET /api/import/export/users - Export all users to CSV
router.get('/export/users', authorize('ADMIN', 'SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: {
                email: true,
                firstName: true,
                lastName: true,
                designation: true,
                phone: true,
                role: true,
                createdAt: true,
            },
        });

        let csv = 'email,first_name,last_name,designation,phone,role,created_at\n';
        users.forEach(u => {
            csv += `${u.email},${u.firstName},${u.lastName},${u.designation || ''},${u.phone || ''},${u.role},${u.createdAt.toISOString()}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
        res.send(csv);
    } catch (error) {
        console.error('User export error:', error);
        res.status(500).json({ error: 'Failed to export users' });
    }
});

// GET /api/import/export/projects - Export all projects to CSV
router.get('/export/projects', authorize('ADMIN', 'SUPERVISOR', 'DIRECTOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const projects = await prisma.project.findMany({
            include: {
                projectHead: { select: { email: true, firstName: true, lastName: true } },
                vertical: { select: { name: true, code: true } },
            },
        });

        let csv = 'code,title,description,category,vertical,status,start_date,end_date,project_head_email,project_head_name,progress\n';
        projects.forEach(p => {
            csv += `"${p.code}","${p.title}","${p.description || ''}",${p.category},${p.vertical.name},${p.status},${p.startDate.toISOString().split('T')[0]},${p.endDate.toISOString().split('T')[0]},${p.projectHead.email},"${p.projectHead.firstName} ${p.projectHead.lastName}",${p.progress}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=projects_export.csv');
        res.send(csv);
    } catch (error) {
        console.error('Project export error:', error);
        res.status(500).json({ error: 'Failed to export projects' });
    }
});

export default router;
