/**
 * Import Employees from Excel
 * Source: Employees_Email_ID_CSIR_res_in_02_12_25.xlsx
 */

import * as XLSX from 'xlsx';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import path from 'path';

const prisma = new PrismaClient();

// Map designations to roles
function getRole(designation: string): UserRole {
    const lower = designation.toLowerCase();
    if (lower.includes('director')) return 'ADMIN';
    if (lower.includes('chief scientist')) return 'PROJECT_HEAD';
    if (lower.includes('senior principal scientist')) return 'PROJECT_HEAD';
    if (lower.includes('principal scientist')) return 'PROJECT_HEAD';
    if (lower.includes('scientist')) return 'EMPLOYEE';
    if (lower.includes('technical officer')) return 'EMPLOYEE';
    if (lower.includes('section officer')) return 'EMPLOYEE';
    if (lower.includes('private secretary')) return 'EMPLOYEE';
    if (lower.includes('stenographer')) return 'EMPLOYEE';
    if (lower.includes('driver')) return 'EMPLOYEE';
    return 'EMPLOYEE';
}

// Determine department based on sheet and designation
function getDepartment(sheetName: string): string | null {
    if (sheetName.includes('SCT-TECH')) return 'Scientific & Technical';
    if (sheetName.includes('Admin')) return 'Administration';
    return null;
}

async function importEmployees() {
    console.log('🚀 Starting Employee Import...\n');

    const xlsxPath = '/opt/csir-serc-portal/Employees_Email_ID_CSIR_res_in_02_12_25.xlsx';
    const workbook = XLSX.readFile(xlsxPath);

    const defaultPassword = await bcrypt.hash('ChangeMe@2025!', 12);
    let imported = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (const sheetName of workbook.SheetNames) {
        console.log(`\n📄 Processing sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

        // Skip header row
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[1]) continue; // Skip empty rows

            const siNo = row[0];
            const firstName = String(row[1] || '').trim();
            const lastName = String(row[2] || '').trim();
            const designation = String(row[3] || '').trim();
            let emailPrefix = String(row[4] || '').trim();

            if (!firstName || !emailPrefix) {
                console.log(`  ⏭️  Skipping row ${i + 1}: missing data`);
                skipped++;
                continue;
            }

            // Construct full email
            const email = emailPrefix.includes('@')
                ? emailPrefix
                : `${emailPrefix}@csir.res.in`;

            try {
                // Check if user already exists
                const existing = await prisma.user.findUnique({
                    where: { email }
                });

                if (existing) {
                    console.log(`  ⏭️  User exists: ${email}`);
                    skipped++;
                    continue;
                }

                const role = getRole(designation);
                const department = getDepartment(sheetName);

                await prisma.user.create({
                    data: {
                        email,
                        password: defaultPassword,
                        firstName,
                        lastName,
                        designation,
                        role,
                        department,
                        isActive: true,
                    }
                });

                console.log(`  ✅ Imported: ${firstName} ${lastName} (${email}) - ${role}`);
                imported++;

            } catch (err: any) {
                console.log(`  ❌ Error: ${email} - ${err.message}`);
                errors.push(`${email}: ${err.message}`);
            }
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Import Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped:  ${skipped}`);
    console.log(`   ❌ Errors:   ${errors.length}`);

    if (errors.length > 0) {
        console.log('\n❌ Errors:');
        errors.forEach(e => console.log(`   - ${e}`));
    }

    console.log('\n✨ Employee import completed!');
}

// Run import
importEmployees()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
