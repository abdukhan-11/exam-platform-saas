const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedEventsAndNotifications() {
  console.log('🌱 Seeding Events and Notifications...\n');

  try {
    // Get existing colleges and users
    const colleges = await prisma.college.findMany();
    if (colleges.length === 0) {
      console.log('❌ No colleges found. Please run the main seed script first.');
      return;
    }

    const users = await prisma.user.findMany({
      where: { role: { in: ['TEACHER', 'STUDENT'] } },
      include: { college: true }
    });

    if (users.length === 0) {
      console.log('❌ No users found. Please run the main seed script first.');
      return;
    }

    // Create events for each college
    for (const college of colleges) {
      console.log(`📅 Creating events for ${college.name}...`);
      
      const collegeUsers = users.filter(user => user.collegeId === college.id);
      const teachers = collegeUsers.filter(user => user.role === 'TEACHER');
      const students = collegeUsers.filter(user => user.role === 'STUDENT');

      // Create different types of events
      const events = [
        {
          title: 'Mid-Term Examination Week',
          description: 'Comprehensive mid-term examinations for all subjects',
          type: 'EXAM',
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          endDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 5 * 24 * 60 * 60 * 1000), // 5 days duration
          priority: 'HIGH',
          isRecurring: false,
          collegeId: college.id,
          isActive: true
        },
        {
          title: 'Assignment Submission Deadline',
          description: 'Final submission deadline for Computer Science assignments',
          type: 'ASSIGNMENT',
          scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          priority: 'MEDIUM',
          isRecurring: false,
          collegeId: college.id,
          isActive: true
        },
        {
          title: 'Academic Calendar Update',
          description: 'Important updates to the academic calendar and schedule',
          type: 'ANNOUNCEMENT',
          scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
          priority: 'LOW',
          isRecurring: false,
          collegeId: college.id,
          isActive: true
        },
        {
          title: 'Monthly Faculty Meeting',
          description: 'Regular monthly meeting for all faculty members',
          type: 'OTHER',
          scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
          priority: 'MEDIUM',
          isRecurring: true,
          recurrencePattern: '0 9 1 * *', // First day of every month at 9 AM
          collegeId: college.id,
          isActive: true
        }
      ];

      for (const eventData of events) {
        const event = await prisma.event.create({
          data: eventData
        });
        console.log(`  ✅ Created event: ${event.title}`);

        // Create notifications for relevant users
        if (event.type === 'EXAM') {
          // Notify all students about exam
          for (const student of students.slice(0, 10)) { // Limit to first 10 students
            await prisma.notification.create({
              data: {
                userId: student.id,
                eventId: event.id,
                title: `Upcoming Exam: ${event.title}`,
                message: `You have an upcoming exam: ${event.title}. Please prepare accordingly.`,
                messageTemplate: 'EXAM_REMINDER',
                type: 'REMINDER',
                channel: 'EMAIL',
                status: 'PENDING',
                collegeId: college.id
              }
            });

            // Create reminder for the exam
            await prisma.eventReminder.create({
              data: {
                eventId: event.id,
                userId: student.id,
                reminderTime: new Date(event.scheduledAt.getTime() - 24 * 60 * 60 * 1000), // 1 day before
                leadTime: 1440, // 24 hours in minutes
                reminderType: 'EMAIL',
                collegeId: college.id
              }
            });
          }
        } else if (event.type === 'ASSIGNMENT') {
          // Notify students about assignment
          for (const student of students.slice(0, 5)) {
            await prisma.notification.create({
              data: {
                userId: student.id,
                eventId: event.id,
                title: `Assignment Due: ${event.title}`,
                message: `Your assignment is due soon: ${event.title}. Please submit on time.`,
                messageTemplate: 'ASSIGNMENT_REMINDER',
                type: 'WARNING',
                channel: 'IN_APP',
                status: 'PENDING',
                collegeId: college.id
              }
            });
          }
        } else if (event.type === 'ANNOUNCEMENT') {
          // Notify all users about announcement
          for (const user of collegeUsers.slice(0, 15)) {
            await prisma.notification.create({
              data: {
                userId: user.id,
                eventId: event.id,
                title: `Announcement: ${event.title}`,
                message: `Important announcement: ${event.description}`,
                messageTemplate: 'ANNOUNCEMENT',
                type: 'INFO',
                channel: 'IN_APP',
                status: 'PENDING',
                collegeId: college.id
              }
            });
          }
        }

        // Create event subscriptions for teachers
        for (const teacher of teachers.slice(0, 3)) {
          await prisma.eventSubscription.create({
            data: {
              userId: teacher.id,
              eventType: event.type,
              notificationChannel: 'EMAIL',
              isActive: true,
              preferences: {
                sendReminders: true,
                reminderTime: '1 hour before',
                includeDetails: true
              },
              optOutTypes: [],
              collegeId: college.id
            }
          });

          // Create reminder for teachers
          await prisma.eventReminder.create({
            data: {
              eventId: event.id,
              userId: teacher.id,
              reminderTime: new Date(event.scheduledAt.getTime() - 2 * 60 * 60 * 1000), // 2 hours before
              leadTime: 120, // 2 hours in minutes
              reminderType: 'EMAIL',
              collegeId: college.id
            }
          });
        }
      }

      console.log(`  📊 Created ${events.length} events with notifications and reminders\n`);
    }

    // Create some additional notifications for testing
    console.log('📧 Creating additional test notifications...');
    
    for (const college of colleges) {
      const collegeUsers = users.filter(user => user.collegeId === college.id);
      
      // Create some failed notifications for testing
      await prisma.notification.create({
        data: {
          userId: collegeUsers[0]?.id || users[0].id,
          title: 'Test Failed Notification',
          message: 'This is a test notification that failed to send',
          type: 'ERROR',
          channel: 'SMS',
          status: 'FAILED',
          retryCount: 3,
          maxRetries: 3,
          failureReason: 'Invalid phone number format',
          metadata: { retryAttempts: 3, lastError: 'SMS_SEND_FAILED' },
          collegeId: college.id
        }
      });

      // Create some delivered notifications
      await prisma.notification.create({
        data: {
          userId: collegeUsers[0]?.id || users[0].id,
          title: 'Test Delivered Notification',
          message: 'This is a test notification that was successfully delivered',
          type: 'SUCCESS',
          channel: 'PUSH',
          status: 'DELIVERED',
          sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
          collegeId: college.id
        }
      });
    }

    console.log('✅ Events and Notifications seeding completed successfully!\n');

    // Display summary
    const eventCount = await prisma.event.count();
    const notificationCount = await prisma.notification.count();
    const subscriptionCount = await prisma.eventSubscription.count();
    const reminderCount = await prisma.eventReminder.count();

    console.log('📊 Seeding Summary:');
    console.log(`  Events: ${eventCount}`);
    console.log(`  Notifications: ${notificationCount}`);
    console.log(`  Event Subscriptions: ${subscriptionCount}`);
    console.log(`  Event Reminders: ${reminderCount}`);

  } catch (error) {
    console.error('❌ Error seeding events and notifications:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedEventsAndNotifications();
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

module.exports = { seedEventsAndNotifications };
