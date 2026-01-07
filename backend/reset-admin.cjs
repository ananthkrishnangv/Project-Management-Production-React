const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function main() {
    const password = 'Admin@SERC2025!';
    console.log('Hashing password with argon2...');

    const hashedPassword = await argon2.hash(password);
    console.log('Password hashed successfully');
    console.log('Hash prefix:', hashedPassword.substring(0, 20));

    // Update or create admin user
    const user = await prisma.user.upsert({
        where: { email: 'admin@serc.res.in' },
        update: {
            password: hashedPassword,
            isActive: true
        },
        create: {
            email: 'admin@serc.res.in',
            password: hashedPassword,
            firstName: 'System',
            lastName: 'Administrator',
            role: 'ADMIN',
            isActive: true
        }
    });

    console.log('User updated/created:', user.id);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Active:', user.isActive);

    // Verify the password can be verified
    console.log('\nVerifying password...');
    const freshUser = await prisma.user.findUnique({ where: { email: 'admin@serc.res.in' } });
    const isValid = await argon2.verify(freshUser.password, password);
    console.log('Password verification:', isValid ? 'SUCCESS' : 'FAILED');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
