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
      name: 'System Administrator',
      email: 'admin@example.com',
      password,
    },
  });

  // College
  const college = await prisma.college.upsert({
    where: { code: 'COLL-001' },
    update: { name: 'Demo College', username: 'demo-college' },
    create: {
      code: 'COLL-001',
      name: 'Demo College',
      username: 'demo-college',
      email: 'info@demo-college.edu',
      city: 'Karachi',
      state: 'Sindh',
      country: 'Pakistan',
      address: '123 Main Street, Karachi',
      phone: '+92-21-1234567',
      website: 'https://demo-college.edu',
    },
  });

  // Class
  const class1 = await prisma.class.upsert({
    where: { 
      collegeId_name_academicYear: { 
        collegeId: college.id, 
        name: 'Class 10', 
        academicYear: '2024-2025' 
      } 
    },
    update: {},
    create: {
      name: 'Class 10',
      description: 'Tenth Grade',
      academicYear: '2024-2025',
      collegeId: college.id,
    },
  });

  // Subject
  const subject = await prisma.subject.upsert({
    where: { 
      collegeId_code: { 
        collegeId: college.id, 
        code: 'MATH-001' 
      } 
    },
    update: { name: 'Mathematics' },
    create: {
      collegeId: college.id,
      code: 'MATH-001',
      name: 'Mathematics',
      description: 'Basic Mathematics for Class 10',
      credits: 3,
      classId: class1.id,
    },
  });

  // User (College Admin) - can perform all teacher functions
  const adminPassword2 = await bcrypt.hash('admin123', 10);
  const collegeAdminUser = await prisma.user.upsert({
    where: { collegeId_email: { collegeId: college.id, email: 'admin@demo-college.edu' } },
    update: {},
    create: {
      name: 'College Admin',
      email: 'admin@demo-college.edu',
      password: adminPassword2,
      role: 'COLLEGE_ADMIN',
      collegeId: college.id,
      position: 'Administrator', // This will redirect to college-admin dashboard
    },
  });

  // User (Student)
  const studentPassword = await bcrypt.hash('student123', 10);
  const student = await prisma.user.upsert({
    where: { collegeId_email: { collegeId: college.id, email: 'student@demo-college.edu' } },
    update: {},
    create: {
      name: 'Jane Smith',
      email: 'student@demo-college.edu',
      password: studentPassword,
      role: 'STUDENT',
      rollNo: 'STU-001',
      collegeId: college.id,
    },
  });

  // Student Profile
  const studentProfile = await prisma.studentProfile.upsert({
    where: { userId: student.id },
    update: {},
    create: {
      userId: student.id,
      collegeId: college.id,
      rollNo: 'STU-001',
      fatherName: 'Robert Smith',
      motherName: 'Mary Smith',
      dateOfBirth: new Date('2006-01-15'),
      gender: 'FEMALE',
      address: '456 Student Street, Karachi',
      phone: '+92-300-1234567',
    },
  });

  // Admin Class Assignment (admin handles both admin and teacher functions)
  const teacherAssignment = await prisma.teacherClassAssignment.upsert({
    where: { 
      teacherId_classId_subjectId: { 
        teacherId: collegeAdminUser.id, 
        classId: class1.id, 
        subjectId: subject.id 
      } 
    },
    update: {},
    create: {
      teacherId: collegeAdminUser.id,
      classId: class1.id,
      subjectId: subject.id,
    },
  });

  // Enrollment
  const enrollment = await prisma.enrollment.upsert({
    where: { 
      userId_classId: { 
        userId: student.id, 
        classId: class1.id 
      } 
    },
    update: {},
    create: {
      userId: student.id,
      classId: class1.id,
      status: 'ACTIVE',
    },
  });

  console.log({ 
    superAdmin, 
    college, 
    class1,
    subject, 
    collegeAdminUser, 
    student, 
    studentProfile,
    teacherAssignment,
    enrollment
  });
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
