const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@serc.res.in' },
        select: { id: true, email: true, role: true, firstName: true, lastName: true, password: true }
    });
    console.log('User found:', user ? 'Yes' : 'No');
    if (user) {
        console.log('ID:', user.id);
        console.log('Email:', user.email);
        console.log('Role:', user.role);
        console.log('Name:', user.firstName, user.lastName);
        console.log('Password hash exists:', !!user.password);
    }
}

main().finally(() => prisma.$disconnect());
