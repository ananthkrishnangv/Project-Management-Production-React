import prisma from '../src/config/database.js';
import argon2 from 'argon2';

async function main() {
    console.log('🌱 Starting database seed...\n');

    // Create default admin user
    const adminPassword = await argon2.hash('Admin@SERC2024');

    const admin = await prisma.user.upsert({
        where: { email: 'admin@serc.res.in' },
        update: {},
        create: {
            email: 'admin@serc.res.in',
            password: adminPassword,
            firstName: 'System',
            lastName: 'Administrator',
            designation: 'System Admin',
            role: 'ADMIN',
            isActive: true,
        },
    });
    console.log('✅ Admin user created:', admin.email);

    // Create default director
    const directorPassword = await argon2.hash('Director@SERC2024');
    const director = await prisma.user.upsert({
        where: { email: 'director@serc.res.in' },
        update: {},
        create: {
            email: 'director@serc.res.in',
            password: directorPassword,
            firstName: 'N',
            lastName: 'Anandavalli',
            designation: 'Director',
            role: 'DIRECTOR',
            isActive: true,
        },
    });
    console.log('✅ Director user created:', director.email);

    // Create verticals
    const verticals = [
        { name: 'Wind Engineering', code: 'WE', description: 'Aerodynamic studies and wind effects on structures' },
        { name: 'Tower Testing', code: 'TT', description: 'Testing and certification of transmission towers' },
        { name: 'Structural Health Monitoring', code: 'SHM', description: 'Monitoring and assessment of structural health' },
        { name: 'Concrete Technology', code: 'CT', description: 'Advanced concrete materials and technology' },
        { name: 'Steel Structures', code: 'SS', description: 'Design and testing of steel structures' },
        { name: 'Earthquake Engineering', code: 'EE', description: 'Seismic analysis and design' },
        { name: 'Fatigue & Fracture', code: 'FF', description: 'Fatigue and fracture mechanics studies' },
        { name: 'Offshore Structures', code: 'OS', description: 'Design of offshore and marine structures' },
        { name: 'Smart Materials', code: 'SM', description: 'Smart and advanced materials research' },
        { name: 'Numerical Modelling', code: 'NM', description: 'Computational and numerical methods' },
    ];

    for (const v of verticals) {
        await prisma.vertical.upsert({
            where: { code: v.code },
            update: {},
            create: v,
        });
    }
    console.log('✅ Verticals created:', verticals.length);

    // Create special areas
    const specialAreas = [
        { name: 'Structural Health Monitoring & Life Extension', description: 'Monitoring structural health and extending service life' },
        { name: 'Disaster Mitigation', description: 'Natural and man-made disaster mitigation strategies' },
        { name: 'Advanced Materials for Sustainable Structures', description: 'Research on sustainable construction materials' },
        { name: 'Special and Multi-functional Structures', description: 'Design of specialized structural systems' },
        { name: 'Energy Infrastructure', description: 'Structures for energy sector including renewable energy' },
        { name: 'Offshore Structures', description: 'Offshore platforms and coastal structures' },
    ];

    for (const area of specialAreas) {
        await prisma.specialArea.upsert({
            where: { name: area.name },
            update: {},
            create: area,
        });
    }
    console.log('✅ Special areas created:', specialAreas.length);

    // Create sample supervisor (BKMD)
    const supervisorPassword = await argon2.hash('Supervisor@SERC2024');
    await prisma.user.upsert({
        where: { email: 'supervisor@serc.res.in' },
        update: {},
        create: {
            email: 'supervisor@serc.res.in',
            password: supervisorPassword,
            firstName: 'M.B.',
            lastName: 'Anoop',
            designation: 'Chief Scientist',
            role: 'SUPERVISOR',
            isActive: true,
        },
    });
    console.log('✅ Supervisor user created');

    // Create sample project head
    const piPassword = await argon2.hash('PI@SERC2024');
    const projectHead = await prisma.user.upsert({
        where: { email: 'pi@serc.res.in' },
        update: {},
        create: {
            email: 'pi@serc.res.in',
            password: piPassword,
            firstName: 'Saptarshi',
            lastName: 'Sasmal',
            designation: 'Senior Principal Scientist',
            role: 'PROJECT_HEAD',
            isActive: true,
        },
    });
    console.log('✅ Project Head user created');

    // Create sample project
    const windEngineering = await prisma.vertical.findUnique({ where: { code: 'WE' } });

    if (windEngineering) {
        await prisma.project.upsert({
            where: { code: 'GAP-2025-WE-001' },
            update: {},
            create: {
                code: 'GAP-2025-WE-001',
                title: 'Wind Load Assessment for Tall Buildings in Urban Environment',
                description: 'Comprehensive study on wind effects on tall buildings considering urban terrain roughness and interference effects',
                category: 'GAP',
                verticalId: windEngineering.id,
                projectHeadId: projectHead.id,
                status: 'ACTIVE',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2027-12-31'),
                objectives: 'To develop guidelines for wind load estimation in urban environments',
                progress: 15,
            },
        });
        console.log('✅ Sample project created');
    }

    // Create system config
    const configs = [
        { key: 'DEFAULT_CURRENCY', value: 'INR', description: 'Default currency for financial entries' },
        { key: 'USD_INR_RATE', value: '83.50', description: 'Fallback USD to INR rate' },
        { key: 'MOU_EXPIRY_ALERT_DAYS', value: '30', description: 'Days before MoU expiry to send alert' },
        { key: 'WEEKLY_DIGEST_DAY', value: 'MONDAY', description: 'Day to send weekly digest emails' },
    ];

    for (const cfg of configs) {
        await prisma.systemConfig.upsert({
            where: { key: cfg.key },
            update: {},
            create: cfg,
        });
    }
    console.log('✅ System config created');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('Default credentials:');
    console.log('─────────────────────────────────');
    console.log('Admin:      admin@serc.res.in / Admin@SERC2024');
    console.log('Director:   director@serc.res.in / Director@SERC2024');
    console.log('Supervisor: supervisor@serc.res.in / Supervisor@SERC2024');
    console.log('PI:         pi@serc.res.in / PI@SERC2024');
    console.log('─────────────────────────────────\n');
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
