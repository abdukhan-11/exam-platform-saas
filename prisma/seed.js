const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // SuperAdmin
  const password = await bcrypt.hash('admin123', 10);
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password,
      name: 'System Administrator',
    },
  });

  // College
  const college = await prisma.college.upsert({
    where: { code: 'COLL-001' },
    update: { name: 'Demo College' },
    create: {
      code: 'COLL-001',
      name: 'Demo College',
      email: 'info@demo-college.edu',
      city: 'Karachi',
      state: 'Sindh',
      country: 'Pakistan',
    },
  });

  // Subject
  const subject = await prisma.subject.upsert({
    where: { collegeId_code: { collegeId: college.id, code: 'SUB-001' } },
    update: { name: 'Mathematics' },
    create: {
      collegeId: college.id,
      code: 'SUB-001',
      name: 'Mathematics',
      description: 'Basic Mathematics',
    },
  });

  console.log({ superAdmin, college, subject });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
