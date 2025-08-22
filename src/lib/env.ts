import { PrismaClient } from '../src/generated/prisma';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // Create a SuperAdmin
    const hashedPassword = await hash('admin123', 10);
    const superAdmin = await prisma.superAdmin.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'System Administrator',
      },
    });
    console.log('Created SuperAdmin:', superAdmin);

    // Create a College
    const college = await prisma.college.upsert({
      where: { code: 'DEMO001' },
      update: {},
      create: {
        name: 'Demo College',
        code: 'DEMO001',
        address: '123 Education St',
        city: 'Demo City',
        state: 'Demo State',
        country: 'India',
      },
    });
    console.log('Created College:', college);

    // Create Users (Teacher and Student)
    const teacherPassword = await hash('teacher123', 10);
    const teacher = await prisma.user.upsert({
      where: { email: 'teacher@example.com' },
      update: {},
      create: {
        email: 'teacher@example.com',
        password: teacherPassword,
        name: 'Demo Teacher',
        role: 'TEACHER',
        collegeId: college.id,
      },
    });
    console.log('Created Teacher:', teacher);

    const studentPassword = await hash('student123', 10);
    const student = await prisma.user.upsert({
      where: { email: 'student@example.com' },
      update: {},
      create: {
        email: 'student@example.com',
        password: studentPassword,
        name: 'Demo Student',
        role: 'STUDENT',
        collegeId: college.id,
      },
    });
    console.log('Created Student:', student);

    // Create Subject
    const subject = await prisma.subject.upsert({
      where: {
        collegeId_code: {
          collegeId: college.id,
          code: 'MATH101',
        },
      },
      update: {},
      create: {
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics Course',
        collegeId: college.id,
        users: {
          connect: [{ id: teacher.id }],
        },
      },
    });
    console.log('Created Subject:', subject);

    // Create Exam
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const exam = await prisma.exam.create({
      data: {
        title: 'Mathematics Midterm',
        description: 'Midterm exam for Mathematics course',
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
        duration: 120, // 2 hours in minutes
        totalMarks: 100,
        passingMarks: 40,
        collegeId: college.id,
        subjectId: subject.id,
        createdById: teacher.id,
      },
    });
    console.log('Created Exam:', exam);

    // Create Questions
    const questions = await prisma.question.createMany({
      data: [
        {
          text: 'What is 2 + 2?',
          type: 'MULTIPLE_CHOICE',
          options: ['3', '4', '5', '6'],
          correctAnswer: '4',
          marks: 10,
          examId: exam.id,
        },
        {
          text: 'What is the square root of 16?',
          type: 'MULTIPLE_CHOICE',
          options: ['2', '4', '8', '16'],
          correctAnswer: '4',
          marks: 10,
          examId: exam.id,
        },
        {
          text: 'Is 7 a prime number?',
          type: 'TRUE_FALSE',
          options: ['True', 'False'],
          correctAnswer: 'True',
          marks: 10,
          examId: exam.id,
        },
      ],
    });
    console.log('Created Questions:', questions);

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
