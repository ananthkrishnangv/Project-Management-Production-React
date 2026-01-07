/**
 * Import ECF Projects with Financial Data
 * Source: ECF Project List with Financial and Project Client Name,.xlsx
 */

import * as XLSX from 'xlsx';
import { PrismaClient, ProjectCategory, Currency } from '@prisma/client';

const prisma = new PrismaClient();

// Parse Indian currency format like " 4,38,834.00 "
function parseINRAmount(value: any): number {
    if (!value) return 0;
    const str = String(value).trim();
    // Remove currency symbols, commas, and spaces
    const cleaned = str.replace(/[₹,\s]/g, '');
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
}

async function findProjectHead(name: string | null) {
    if (!name) return null;

    // Clean the name - remove titles
    const cleanName = name.replace(/^(Dr\.|Shri|Smt|Ms\.?|Mr\.?)\s*/i, '').trim();
    const parts = cleanName.split(/\s+/);

    if (parts.length === 0) return null;

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

async function getOrCreateVertical(lab: string) {
    if (!lab) lab = 'GEN';

    const code = lab.toUpperCase().replace(/\s+/g, '');
    const existing = await prisma.vertical.findUnique({ where: { code } });
    if (existing) return existing;

    return prisma.vertical.create({
        data: {
            name: lab,
            code,
            description: `${lab} Laboratory`,
            isActive: true
        }
    });
}

async function importECFWithFinancials() {
    console.log('🚀 Starting ECF Financial Import...\n');

    const xlsxPath = '/opt/csir-serc-portal/ECF Project List with Financial and Project Client Name,.xlsx';
    const workbook = XLSX.readFile(xlsxPath);

    let imported = 0;
    let updated = 0;
    let budgetCreated = 0;
    let errors: string[] = [];

    const defaultUser = await prisma.user.findFirst({
        where: { role: 'ADMIN', isActive: true }
    });

    if (!defaultUser) {
        console.error('❌ No admin user found!');
        return;
    }

    for (const sheetName of workbook.SheetNames) {
        console.log(`📄 Processing sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

        // Find header row
        let headerRow = 0;
        for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i];
            if (row && row.some((cell: any) =>
                String(cell || '').toLowerCase().includes('project no')
            )) {
                headerRow = i;
                break;
            }
        }

        for (let i = headerRow + 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 3) continue;

            const sno = row[0];
            if (typeof sno !== 'number') continue;

            const projectCode = String(row[1] || '').trim();
            const title = String(row[2] || '').trim();
            const client = String(row[3] || '').trim();
            const piName = String(row[4] || '').trim();
            const lab = String(row[5] || '').trim();
            const projectCharges = parseINRAmount(row[6]);

            if (!projectCode || !title) continue;

            try {
                // Check if project exists
                const existingProject = await prisma.project.findUnique({
                    where: { code: projectCode }
                });

                let projectId: string;

                if (existingProject) {
                    // Update existing project with client info
                    await prisma.project.update({
                        where: { code: projectCode },
                        data: {
                            description: existingProject.description
                                ? `${existingProject.description}\nClient: ${client}`
                                : `Client: ${client}`
                        }
                    });
                    projectId = existingProject.id;
                    console.log(`  📝 Updated: ${projectCode}`);
                    updated++;
                } else {
                    // Create new project
                    const projectHead = await findProjectHead(piName) || defaultUser;
                    const vertical = await getOrCreateVertical(lab);

                    const project = await prisma.project.create({
                        data: {
                            code: projectCode,
                            title: title.substring(0, 500),
                            description: `Client: ${client}\nLab: ${lab}`,
                            category: 'CNP' as ProjectCategory,
                            verticalId: vertical.id,
                            projectHeadId: projectHead.id,
                            status: 'ACTIVE',
                            startDate: new Date(),
                            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                            progress: 0,
                        }
                    });
                    projectId = project.id;
                    console.log(`  ✅ Created: ${projectCode}`);
                    imported++;
                }

                // Create/Update budget record with project charges
                if (projectCharges > 0) {
                    const existingBudget = await prisma.budget.findFirst({
                        where: {
                            projectId,
                            fiscalYear: '2024-25',
                            category: 'PROJECT_CHARGES'
                        }
                    });

                    if (!existingBudget) {
                        await prisma.budget.create({
                            data: {
                                projectId,
                                fiscalYear: '2024-25',
                                category: 'PROJECT_CHARGES',
                                amountINR: projectCharges,
                                utilized: 0,
                            }
                        });
                        console.log(`    💰 Budget: ₹${projectCharges.toLocaleString('en-IN')}`);
                        budgetCreated++;
                    }
                }

            } catch (err: any) {
                console.log(`  ❌ Error ${projectCode}: ${err.message}`);
                errors.push(`${projectCode}: ${err.message}`);
            }
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 ECF Financial Import Summary:');
    console.log(`   ✅ Projects Created: ${imported}`);
    console.log(`   📝 Projects Updated: ${updated}`);
    console.log(`   💰 Budgets Created:  ${budgetCreated}`);
    console.log(`   ❌ Errors:           ${errors.length}`);

    console.log('\n✨ ECF financial import completed!');
}

// Run import
importECFWithFinancials()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
