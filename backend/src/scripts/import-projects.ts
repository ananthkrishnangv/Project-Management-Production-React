/**
 * Import Projects from Excel
 * Source: Project List to ICT.xlsx
 * 
 * Sheets:
 * - OngoingCSIR funded project list (MLP/OLP projects)
 * - GAP projects (Grant-in-Aid)
 * - ECF project (External Consultancy/Funded)
 */

import * as XLSX from 'xlsx';
import { PrismaClient, ProjectCategory, ProjectStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Parse date from Excel (could be string or Excel date number)
function parseDate(value: any): Date | null {
    if (!value) return null;

    // Excel date number
    if (typeof value === 'number') {
        const date = XLSX.SSF.parse_date_code(value);
        if (date) {
            return new Date(date.y, date.m - 1, date.d);
        }
    }

    // String date like "April 2020 - March 2025"
    if (typeof value === 'string') {
        // Try to extract start date
        const match = value.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})/i);
        if (match) {
            const months: Record<string, number> = {
                jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
                jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
            };
            const month = months[match[1].toLowerCase().substring(0, 3)];
            const year = parseInt(match[2]);
            return new Date(year, month, 1);
        }
    }

    return new Date(); // Default to now
}

// Parse end date from duration string like "April 2020 - March 2025"
function parseEndDate(value: any): Date | null {
    if (!value) return null;

    if (typeof value === 'number') {
        return parseDate(value);
    }

    if (typeof value === 'string') {
        // Look for the second date in the string
        const matches = value.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})/gi);
        if (matches && matches.length >= 2) {
            return parseDate(matches[1]);
        }
        // If only one date, use it
        if (matches && matches.length === 1) {
            return parseDate(matches[0]);
        }
    }

    // Default: 2 years from now
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d;
}

// Get project status from string
function getStatus(statusStr: string | null): ProjectStatus {
    if (!statusStr) return 'ACTIVE';
    const lower = statusStr.toLowerCase();
    if (lower.includes('completed')) return 'COMPLETED';
    if (lower.includes('ongoing')) return 'ACTIVE';
    if (lower.includes('hold')) return 'ON_HOLD';
    if (lower.includes('cancelled')) return 'CANCELLED';
    return 'ACTIVE';
}

// Map category code to ProjectCategory
function mapCategory(code: string): ProjectCategory {
    if (code.startsWith('MLP') || code.startsWith('OLP') || code.startsWith('HCP') ||
        code.startsWith('FBR') || code.startsWith('NCP')) {
        return 'OLP'; // Other Lab Projects for CSIR internal
    }
    if (code.startsWith('GAP')) return 'GAP';
    if (code.startsWith('CNP')) return 'CNP';
    return 'EFP';
}

async function getOrCreateVertical(name: string, code: string) {
    const existing = await prisma.vertical.findUnique({ where: { code } });
    if (existing) return existing;

    return prisma.vertical.create({
        data: { name, code, description: name, isActive: true }
    });
}

async function getAdminUser() {
    // Get admin user to use as default project head
    const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN', isActive: true }
    });
    if (admin) return admin;

    // Fallback: get any active user
    return prisma.user.findFirst({ where: { isActive: true } });
}

async function findProjectHead(name: string | null) {
    if (!name) return null;

    // Clean the name
    const cleanName = name.replace(/^(Dr\.|Shri|Smt|Ms\.?|Mr\.?)\s*/i, '').trim();
    const parts = cleanName.split(/\s+/);

    if (parts.length === 0) return null;

    // Try to find by first name
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { firstName: { contains: parts[0], mode: 'insensitive' } },
                { lastName: { contains: parts[parts.length - 1], mode: 'insensitive' } }
            ]
        }
    });

    return user;
}

async function importProjects() {
    console.log('🚀 Starting Project Import...\n');

    const xlsxPath = '/opt/csir-serc-portal/Project List to ICT.xlsx';
    const workbook = XLSX.readFile(xlsxPath);

    let imported = 0;
    let skipped = 0;
    let errors: string[] = [];

    const defaultUser = await getAdminUser();
    if (!defaultUser) {
        console.error('❌ No admin user found! Please import employees first.');
        return;
    }

    // Create a default vertical if none exists
    const defaultVertical = await getOrCreateVertical('General', 'GEN');
    const csirVertical = await getOrCreateVertical('CSIR Internal', 'CSIR');
    const gapVertical = await getOrCreateVertical('Grant-in-Aid', 'GAP');
    const ecfVertical = await getOrCreateVertical('External Consultancy', 'ECF');

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
        console.log(`\n📄 Processing sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

        // Determine which sheet type we're dealing with
        let verticalToUse = defaultVertical;
        let categoryPrefix = '';

        if (sheetName.includes('CSIR')) {
            verticalToUse = csirVertical;
            categoryPrefix = 'CSIR-';
        } else if (sheetName.includes('GAP')) {
            verticalToUse = gapVertical;
            categoryPrefix = 'GAP-';
        } else if (sheetName.includes('ECF')) {
            verticalToUse = ecfVertical;
            categoryPrefix = 'ECF-';
        }

        // Find header row (first row with "Title" or "Project No")
        let headerRow = 0;
        for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i];
            if (row && row.some((cell: any) =>
                String(cell || '').toLowerCase().includes('title') ||
                String(cell || '').toLowerCase().includes('project no')
            )) {
                headerRow = i;
                break;
            }
        }

        // Parse based on sheet structure
        for (let i = headerRow + 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 3) continue;

            let projectCode: string;
            let title: string;
            let piName: string | null = null;
            let status: ProjectStatus = 'ACTIVE';
            let startDate: Date | null = null;
            let endDate: Date | null = null;
            let description: string | null = null;

            try {
                if (sheetName.includes('CSIR')) {
                    // S.No, LAB, TITLE, MLP/OLP Number, PI, Theme, Project Duration, Status
                    const sno = row[0];
                    if (typeof sno !== 'number') continue;

                    projectCode = String(row[3] || `CSIR-${Date.now()}-${i}`).trim();
                    title = String(row[2] || '').trim();
                    piName = String(row[4] || '').trim();
                    const theme = String(row[5] || '').trim();
                    const duration = String(row[6] || '').trim();
                    status = getStatus(String(row[7] || ''));

                    startDate = parseDate(duration);
                    endDate = parseEndDate(duration);
                    description = theme ? `Theme: ${theme}` : null;

                } else if (sheetName.includes('GAP')) {
                    // SI. No, Project No., Title, Grant Received from, R&D Partner, Project Leader, Start Date, End Date
                    const sno = row[0];
                    if (typeof sno !== 'number') continue;

                    projectCode = String(row[1] || `GAP-${Date.now()}-${i}`).trim();
                    title = String(row[2] || '').trim();
                    const grantFrom = String(row[3] || '').trim();
                    const partner = String(row[4] || '').trim();
                    piName = String(row[5] || '').trim();
                    startDate = parseDate(row[6]);
                    endDate = parseDate(row[7]);

                    description = [
                        grantFrom ? `Funded by: ${grantFrom}` : null,
                        partner ? `Partner: ${partner}` : null
                    ].filter(Boolean).join('\n');

                } else if (sheetName.includes('ECF')) {
                    // S.No, Project No., Title, Client, Project Leader, Lab, Project charges
                    const sno = row[0];
                    if (typeof sno !== 'number') continue;

                    projectCode = String(row[1] || `ECF-${Date.now()}-${i}`).trim();
                    title = String(row[2] || '').trim();
                    const client = String(row[3] || '').trim();
                    piName = String(row[4] || '').trim();
                    const lab = String(row[5] || '').trim();
                    const charges = row[6];

                    description = [
                        client ? `Client: ${client}` : null,
                        lab ? `Lab: ${lab}` : null,
                        charges ? `Project Charges: ₹${charges.toLocaleString()}` : null
                    ].filter(Boolean).join('\n');

                    // ECF projects typically don't have end dates in the data
                    startDate = new Date();
                    endDate = new Date();
                    endDate.setFullYear(endDate.getFullYear() + 1);

                } else {
                    continue;
                }

                if (!title || !projectCode) {
                    skipped++;
                    continue;
                }

                // Check if project already exists
                const existing = await prisma.project.findUnique({
                    where: { code: projectCode }
                });

                if (existing) {
                    console.log(`  ⏭️  Project exists: ${projectCode}`);
                    skipped++;
                    continue;
                }

                // Find project head or use default
                let projectHead = await findProjectHead(piName);
                if (!projectHead) {
                    projectHead = defaultUser;
                }

                // Create project
                const category = mapCategory(projectCode);

                await prisma.project.create({
                    data: {
                        code: projectCode,
                        title: title.substring(0, 500), // Limit title length
                        description,
                        category,
                        verticalId: verticalToUse.id,
                        projectHeadId: projectHead.id,
                        status,
                        startDate: startDate || new Date(),
                        endDate: endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                        progress: status === 'COMPLETED' ? 100 : 0,
                    }
                });

                console.log(`  ✅ Imported: ${projectCode} - ${title.substring(0, 50)}...`);
                imported++;

            } catch (err: any) {
                console.log(`  ❌ Error row ${i}: ${err.message}`);
                errors.push(`Row ${i}: ${err.message}`);
            }
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Import Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped:  ${skipped}`);
    console.log(`   ❌ Errors:   ${errors.length}`);

    if (errors.length > 0) {
        console.log('\n❌ First 10 Errors:');
        errors.slice(0, 10).forEach(e => console.log(`   - ${e}`));
    }

    console.log('\n✨ Project import completed!');
}

// Run import
importProjects()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
