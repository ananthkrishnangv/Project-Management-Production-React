// Import users from CSV file
import prisma from '../src/config/database.js';
import argon2 from 'argon2';
import fs from 'fs';

interface EmployeeRow {
    firstName: string;
    lastName: string;
    designation: string;
    email: string;
}

// Designation to Role mapping
function getRole(designation: string): 'ADMIN' | 'DIRECTOR' | 'SUPERVISOR' | 'PROJECT_HEAD' | 'EMPLOYEE' {
    const d = designation.toLowerCase();
    if (d.includes('director')) return 'DIRECTOR';
    if (d.includes('chief scientist')) return 'SUPERVISOR';
    if (d.includes('principal scientist') || d.includes('senior principal scientist')) return 'PROJECT_HEAD';
    return 'EMPLOYEE';
}

async function importUsers() {
    console.log('🔄 Starting user import from CSV...\n');

    // Read CSV file
    const csvContent = fs.readFileSync('/tmp/employees.csv', 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    // Skip header
    const dataLines = lines.slice(1);

    // Default password for all imported users
    const defaultPassword = await argon2.hash('SERC@2025!');

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // First, delete sample data to avoid FK constraints
    console.log('🧹 Removing sample data...');

    // Delete all projects first (this will cascade delete milestones, budgets, etc.)
    await prisma.project.deleteMany({});
    console.log('   - Projects deleted');

    // Delete sample users
    await prisma.user.deleteMany({
        where: {
            email: {
                in: ['admin@serc.res.in', 'director@serc.res.in', 'supervisor@serc.res.in', 'pi@serc.res.in']
            }
        }
    });

    // Process each employee
    for (const line of dataLines) {
        const parts = line.split(',');
        if (parts.length < 5) continue;

        // Parse CSV: SI. No., First Name, Last Name, Designation, Email ID
        const firstName = parts[1]?.trim() || '';
        const lastName = parts[2]?.trim() || '';
        const designation = parts[3]?.trim() || '';
        const emailPrefix = parts[4]?.trim() || '';

        if (!firstName || !emailPrefix) {
            skipped++;
            continue;
        }

        const email = `${emailPrefix}@csir.res.in`;
        const role = getRole(designation);

        try {
            await prisma.user.upsert({
                where: { email },
                update: {
                    firstName,
                    lastName,
                    designation,
                    role,
                    isActive: true,
                },
                create: {
                    email,
                    password: defaultPassword,
                    firstName,
                    lastName,
                    designation,
                    role,
                    isActive: true,
                    twoFactorEnabled: false,
                },
            });
            imported++;
            console.log(`✅ ${firstName} ${lastName} (${role}) - ${email}`);
        } catch (error: any) {
            console.error(`❌ Failed to import ${firstName} ${lastName}: ${error.message}`);
            errors++;
        }
    }

    // Create system admin user
    console.log('\n📌 Creating system admin...');
    await prisma.user.upsert({
        where: { email: 'admin@serc.res.in' },
        update: {},
        create: {
            email: 'admin@serc.res.in',
            password: await argon2.hash('Admin@SERC2025!'),
            firstName: 'System',
            lastName: 'Administrator',
            designation: 'System Admin',
            role: 'ADMIN',
            isActive: true,
        },
    });

    console.log('\n' + '═'.repeat(50));
    console.log('📊 Import Summary:');
    console.log('═'.repeat(50));
    console.log(`✅ Imported: ${imported}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('═'.repeat(50));
    console.log('\n🔐 Default password for all users: SERC@2025!');
    console.log('🔐 Admin account: admin@serc.res.in / Admin@SERC2025!');
    console.log('\n🎉 User import completed!\n');
}

importUsers()
    .catch((e) => {
        console.error('Import error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
