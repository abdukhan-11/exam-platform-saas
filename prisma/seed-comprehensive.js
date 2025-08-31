const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🚀 Starting comprehensive database seeding...\n');
    
    // Create Super Admin
    const password = await bcrypt.hash('admin123', 10);
    const superAdmin = await prisma.superAdmin.upsert({
      where: { email: 'admin@exam-platform.com' },
      update: {},
      create: {
        name: 'System Administrator',
        email: 'admin@exam-platform.com',
        password,
      },
    });
    console.log('✅ Super Admin created');
    
    // Create Colleges
    const colleges = [];
    const collegeData = [
      { code: 'COLL-001', name: 'Karachi University', city: 'Karachi', state: 'Sindh', username: 'karachi-university' },
      { code: 'COLL-002', name: 'Lahore College', city: 'Lahore', state: 'Punjab', username: 'lahore-college' },
      { code: 'COLL-003', name: 'Islamabad Institute', city: 'Islamabad', state: 'Federal', username: 'islamabad-institute' }
    ];
    
    for (const data of collegeData) {
      const college = await prisma.college.upsert({
        where: { code: data.code },
        update: {
          username: data.username,
        },
        create: {
          code: data.code,
          name: data.name,
          city: data.city,
          state: data.state,
          username: data.username,
          country: 'Pakistan',
          email: `info@${data.code.toLowerCase()}.edu`,
          website: `https://${data.code.toLowerCase()}.edu`,
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
      });
      colleges.push(college);
      console.log(`✅ College created: ${college.name}`);
    }
    
    // Create Users for each college
    const users = [];
    for (const college of colleges) {
      // College Admin
      const adminPassword = await bcrypt.hash('admin123', 10);
      const admin = await prisma.user.upsert({
        where: { collegeId_email: { collegeId: college.id, email: `admin@${college.code.toLowerCase()}.edu` } },
        update: {},
        create: {
          name: `${college.name} Administrator`,
          email: `admin@${college.code.toLowerCase()}.edu`,
          password: adminPassword,
          role: 'COLLEGE_ADMIN',
          collegeId: college.id,
        },
      });
      users.push(admin);
      
      // No teacher users anymore - college admin handles teaching tasks
      
      // Students (20 per college)
      for (let i = 1; i <= 20; i++) {
        const studentPassword = await bcrypt.hash('student123', 10);
        const student = await prisma.user.upsert({
          where: { collegeId_email: { collegeId: college.id, email: `student${i}@${college.code.toLowerCase()}.edu` } },
          update: {},
          create: {
            name: `Student ${i} - ${college.name}`,
            email: `student${i}@${college.code.toLowerCase()}.edu`,
            password: studentPassword,
            role: 'STUDENT',
            rollNo: `${college.code}-${String(i).padStart(3, '0')}`,
            collegeId: college.id,
          },
        });
        users.push(student);
      }
      
      console.log(`✅ Users created for ${college.name}: 1 admin, 20 students`);
    }
    
    // Create Classes
    const classes = [];
    const classNames = ['Computer Science 1st Year', 'Computer Science 2nd Year', 'Electrical Engineering 1st Year'];
    const academicYears = ['2024-2025', '2023-2024'];
    
    for (const college of colleges) {
      for (const className of classNames) {
        for (const year of academicYears) {
          const classData = await prisma.class.upsert({
            where: {
              collegeId_name_academicYear: {
                collegeId: college.id,
                name: className,
                academicYear: year
              }
            },
            update: {},
            create: {
              name: className,
              description: `${className} at ${college.name}`,
              academicYear: year,
              collegeId: college.id,
            },
          });
          classes.push(classData);
        }
      }
    }
    console.log(`✅ Classes created: ${classes.length} total`);
    
    // Create Subjects
    const subjects = [];
    const subjectData = [
      { code: 'CS101', name: 'Introduction to Programming', credits: 4 },
      { code: 'CS102', name: 'Data Structures', credits: 4 },
      { code: 'CS103', name: 'Algorithms', credits: 4 },
      { code: 'EE101', name: 'Circuit Analysis', credits: 4 }
    ];
    
    for (const college of colleges) {
      const collegeClasses = classes.filter(c => c.collegeId === college.id);
      for (const subjectInfo of subjectData) {
        const randomClass = collegeClasses[Math.floor(Math.random() * collegeClasses.length)];
        const subject = await prisma.subject.upsert({
          where: {
            collegeId_code: {
              collegeId: college.id,
              code: subjectInfo.code
            }
          },
          update: {},
          create: {
            name: subjectInfo.name,
            code: subjectInfo.code,
            description: `${subjectInfo.name} course`,
            credits: subjectInfo.credits,
            collegeId: college.id,
            classId: randomClass?.id,
          },
        });
        subjects.push(subject);
      }
    }
    console.log(`✅ Subjects created: ${subjects.length} total`);
    
    // Create Exams
    const exams = [];
    for (const college of colleges) {
      const collegeSubjects = subjects.filter(s => s.collegeId === college.id);
      const collegeTeachers = users.filter(u => u.collegeId === college.id && u.role === 'COLLEGE_ADMIN');
      
      if (collegeSubjects.length > 0 && collegeTeachers.length > 0) {
        for (let i = 1; i <= 3; i++) {
          const subject = collegeSubjects[Math.floor(Math.random() * collegeSubjects.length)];
          const teacher = collegeTeachers[Math.floor(Math.random() * collegeTeachers.length)];
          const startTime = new Date(Date.now() + (i * 7 * 24 * 60 * 60 * 1000)); // 1 week apart
          const endTime = new Date(startTime.getTime() + (2 * 60 * 60 * 1000)); // 2 hours duration
          
          const exam = await prisma.exam.create({
            data: {
              title: `Mid-Term Examination ${i} - ${subject.name}`,
              description: `Mid-term examination for ${subject.name} course`,
              duration: 120, // 2 hours in minutes
              totalMarks: 100,
              passingMarks: 40,
              startTime,
              endTime,
              isActive: true,
              isPublished: true,
              subjectId: subject.id,
              collegeId: college.id,
              createdById: teacher.id,
              enableQuestionShuffling: true,
              enableTimeLimitPerQuestion: false,
              enableBrowserLock: true,
              enableFullscreenMode: true,
              enableWebcamMonitoring: false,
              enableScreenRecording: false,
              maxAttempts: 1,
              allowRetakes: false,
              retakeDelayHours: 24,
            },
          });
          exams.push(exam);
        }
      }
    }
    console.log(`✅ Exams created: ${exams.length} total`);
    
    // Create Questions
    const questions = [];
    for (const exam of exams) {
      for (let i = 1; i <= 10; i++) {
        const questionType = i <= 6 ? 'MULTIPLE_CHOICE' : i <= 8 ? 'TRUE_FALSE' : 'SHORT_ANSWER';
        const marks = questionType === 'MULTIPLE_CHOICE' ? 8 : questionType === 'TRUE_FALSE' ? 5 : 10;
        
        const question = await prisma.question.create({
          data: {
            text: `Question ${i}: This is a sample ${questionType.toLowerCase().replace('_', ' ')} question for ${exam.title}`,
            type: questionType,
            options: questionType === 'MULTIPLE_CHOICE' ? ['Option A', 'Option B', 'Option C', 'Option D'] : null,
            correctAnswer: questionType === 'TRUE_FALSE' ? 'TRUE' : questionType === 'MULTIPLE_CHOICE' ? 'Option A' : 'Sample answer',
            marks,
            difficulty: 'MEDIUM',
            explanation: `Explanation for question ${i}`,
            examId: exam.id,
          },
        });
        questions.push(question);
        
        // Create options for multiple choice questions
        if (questionType === 'MULTIPLE_CHOICE') {
          const options = ['Option A', 'Option B', 'Option C', 'Option D'];
          for (let j = 0; j < options.length; j++) {
            await prisma.questionOption.create({
              data: {
                questionId: question.id,
                text: options[j],
                isCorrect: j === 0, // First option is correct
                order: j,
              },
            });
          }
        }
      }
      console.log(`✅ 10 questions created for exam: ${exam.title}`);
    }
    
    // Create Student Profiles
    for (const college of colleges) {
      const collegeStudents = users.filter(u => u.collegeId === college.id && u.role === 'STUDENT');
      
      for (let i = 0; i < collegeStudents.length; i++) {
        const student = collegeStudents[i];
        const rollNo = `${college.code}-${String(i + 1).padStart(3, '0')}`;
        
        await prisma.studentProfile.upsert({
          where: { userId: student.id },
          update: {},
          create: {
            userId: student.id,
            collegeId: college.id,
            rollNo,
            fatherName: `Father of ${student.name}`,
            motherName: `Mother of ${student.name}`,
            dateOfBirth: new Date('2000-01-01'),
            gender: 'MALE',
            address: `Address for ${student.name}`,
            phone: '+92-3001234567',
            profileImageUrl: `https://example.com/profiles/${student.id}.jpg`,
          },
        });
      }
      console.log(`✅ ${collegeStudents.length} student profiles created for ${college.name}`);
    }
    
    // Create Enrollments
    for (const classData of classes) {
      const collegeStudents = users.filter(u => u.collegeId === classData.collegeId && u.role === 'STUDENT');
      const enrollmentCount = Math.floor(collegeStudents.length * 0.8); // 80% enrollment
      
      const selectedStudents = collegeStudents.slice(0, enrollmentCount);
      
      for (const student of selectedStudents) {
        await prisma.enrollment.upsert({
          where: {
            userId_classId: {
              userId: student.id,
              classId: classData.id
            }
          },
          update: {},
          create: {
            userId: student.id,
            classId: classData.id,
            enrollmentDate: new Date('2024-01-01'),
            status: 'ACTIVE',
          },
        });
      }
      console.log(`✅ ${enrollmentCount} enrollments created for class: ${classData.name}`);
    }
    
    // Create Teacher Assignments
    for (const classData of classes) {
      const collegeTeachers = users.filter(u => u.collegeId === classData.collegeId && u.role === 'COLLEGE_ADMIN');
      const collegeSubjects = subjects.filter(s => s.collegeId === classData.collegeId);
      
      if (collegeTeachers.length > 0 && collegeSubjects.length > 0) {
        const teacher = collegeTeachers[0];
        const subject = collegeSubjects[0];
        
        await prisma.teacherClassAssignment.upsert({
          where: {
            teacherId_classId_subjectId: {
              teacherId: teacher.id,
              classId: classData.id,
              subjectId: subject.id
            }
          },
          update: {},
          create: {
            teacherId: teacher.id,
            classId: classData.id,
            subjectId: subject.id,
            assignedAt: new Date('2024-01-01'),
            isActive: true,
          },
        });
      }
      console.log(`✅ Teacher assignment created for class: ${classData.name}`);
    }
    
    // Create Events
    for (const college of colleges) {
      for (let i = 1; i <= 5; i++) {
        await prisma.event.create({
          data: {
            title: `Event ${i} - ${college.name}`,
            description: `Sample event for ${college.name}`,
            type: 'ANNOUNCEMENT',
            scheduledAt: new Date(Date.now() + (i * 7 * 24 * 60 * 60 * 1000)),
            collegeId: college.id,
          },
        });
      }
      console.log(`✅ 5 events created for ${college.name}`);
    }
    
    console.log('\n🎉 Comprehensive database seeding completed successfully!');
    console.log('\n🔑 Default Login Credentials:');
    console.log('   Super Admin: admin@exam-platform.com / admin123');
    console.log('   College Admins: admin@[college-code].edu / admin123');
    console.log('   Teachers: teacher[1-5]@[college-code].edu / teacher123');
    console.log('   Students: student[1-20]@[college-code].edu / student123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
