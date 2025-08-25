const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName} - PASSED`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName} - FAILED`);
    if (details) console.log(`   Details: ${details}`);
  }
}

function logSection(title) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🧪 ${title}`);
  console.log(`${'='.repeat(50)}`);
}

function logSummary() {
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(50)}`);
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Some tests failed. Please check the implementation.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed successfully!');
  }
}

async function testEventCreation() {
  logSection('Testing Event Creation');
  
  try {
    // Test creating a new event
    const event = await prisma.event.create({
      data: {
        title: 'Test Event',
        description: 'Test event description',
        type: 'ANNOUNCEMENT',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        priority: 'MEDIUM',
        isRecurring: false,
        collegeId: (await prisma.college.findFirst()).id,
        isActive: true
      }
    });

    logTest('Event Creation', !!event.id, `Created event with ID: ${event.id}`);

    // Test event fields
    const fieldsValid = event.title === 'Test Event' && 
                       event.type === 'ANNOUNCEMENT' && 
                       event.priority === 'MEDIUM' &&
                       event.isRecurring === false;

    logTest('Event Fields Validation', fieldsValid, 
      `Title: ${event.title}, Type: ${event.type}, Priority: ${event.priority}`);

    // Clean up
    await prisma.event.delete({ where: { id: event.id } });
    
    return true;
  } catch (error) {
    logTest('Event Creation', false, error.message);
    return false;
  }
}

async function testNotificationCreation() {
  logSection('Testing Notification Creation');
  
  try {
    const college = await prisma.college.findFirst();
    const user = await prisma.user.findFirst({ where: { collegeId: college.id } });
    
    // Test creating a notification
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Test Notification',
        message: 'Test notification message',
        type: 'INFO',
        channel: 'EMAIL',
        status: 'PENDING',
        collegeId: college.id
      }
    });

    logTest('Notification Creation', !!notification.id, `Created notification with ID: ${notification.id}`);

    // Test notification fields
    const fieldsValid = notification.title === 'Test Notification' && 
                       notification.type === 'INFO' && 
                       notification.channel === 'EMAIL' &&
                       notification.status === 'PENDING';

    logTest('Notification Fields Validation', fieldsValid,
      `Title: ${notification.title}, Type: ${notification.type}, Channel: ${notification.channel}`);

    // Clean up
    await prisma.notification.delete({ where: { id: notification.id } });
    
    return true;
  } catch (error) {
    logTest('Notification Creation', false, error.message);
    return false;
  }
}

async function testEventSubscription() {
  logSection('Testing Event Subscription');
  
  try {
    const college = await prisma.college.findFirst();
    const user = await prisma.user.findFirst({ where: { collegeId: college.id } });
    
    // Test creating an event subscription
    const subscription = await prisma.eventSubscription.create({
      data: {
        userId: user.id,
        eventType: 'EXAM',
        notificationChannel: 'EMAIL',
        isActive: true,
        preferences: { sendReminders: true, reminderTime: '1 hour before' },
        optOutTypes: [],
        collegeId: college.id
      }
    });

    logTest('Event Subscription Creation', !!subscription.id, `Created subscription with ID: ${subscription.id}`);

    // Test subscription fields
    const fieldsValid = subscription.eventType === 'EXAM' && 
                       subscription.notificationChannel === 'EMAIL' &&
                       subscription.isActive === true;

    logTest('Event Subscription Fields Validation', fieldsValid,
      `Event Type: ${subscription.eventType}, Channel: ${subscription.notificationChannel}, Active: ${subscription.isActive}`);

    // Clean up
    await prisma.eventSubscription.delete({ where: { id: subscription.id } });
    
    return true;
  } catch (error) {
    logTest('Event Subscription Creation', false, error.message);
    return false;
  }
}

async function testEventReminder() {
  logSection('Testing Event Reminder');
  
  try {
    const college = await prisma.college.findFirst();
    const user = await prisma.user.findFirst({ where: { collegeId: college.id } });
    
    // Create a test event first
    const event = await prisma.event.create({
      data: {
        title: 'Test Event for Reminder',
        description: 'Test event for reminder testing',
        type: 'EXAM',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: 'HIGH',
        collegeId: college.id,
        isActive: true
      }
    });

    // Test creating an event reminder
    const reminder = await prisma.eventReminder.create({
      data: {
        eventId: event.id,
        userId: user.id,
        reminderTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
        leadTime: 720, // 12 hours in minutes
        reminderType: 'EMAIL',
        collegeId: college.id
      }
    });

    logTest('Event Reminder Creation', !!reminder.id, `Created reminder with ID: ${reminder.id}`);

    // Test reminder fields
    const fieldsValid = reminder.eventId === event.id && 
                       reminder.reminderType === 'EMAIL' &&
                       reminder.leadTime === 720 &&
                       reminder.isSent === false;

    logTest('Event Reminder Fields Validation', fieldsValid,
      `Event ID: ${reminder.eventId}, Type: ${reminder.reminderType}, Lead Time: ${reminder.leadTime}`);

    // Clean up
    await prisma.eventReminder.delete({ where: { id: reminder.id } });
    await prisma.event.delete({ where: { id: event.id } });
    
    return true;
  } catch (error) {
    logTest('Event Reminder Creation', false, error.message);
    return false;
  }
}

async function testMultiTenantIsolation() {
  logSection('Testing Multi-Tenant Isolation');
  
  try {
    const colleges = await prisma.college.findMany({ take: 2 });
    if (colleges.length < 2) {
      logTest('Multi-Tenant Isolation', false, 'Need at least 2 colleges for testing');
      return false;
    }

    // Create events in different colleges
    const event1 = await prisma.event.create({
      data: {
        title: 'College 1 Event',
        description: 'Event in first college',
        type: 'ANNOUNCEMENT',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        collegeId: colleges[0].id,
        isActive: true
      }
    });

    const event2 = await prisma.event.create({
      data: {
        title: 'College 2 Event',
        description: 'Event in second college',
        type: 'ANNOUNCEMENT',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        collegeId: colleges[1].id,
        isActive: true
      }
    });

    // Test that events are isolated by college
    const college1Events = await prisma.event.findMany({ where: { collegeId: colleges[0].id } });
    const college2Events = await prisma.event.findMany({ where: { collegeId: colleges[1].id } });

    const isolationValid = college1Events.some(e => e.id === event1.id) &&
                          college2Events.some(e => e.id === event2.id) &&
                          !college1Events.some(e => e.id === event2.id) &&
                          !college2Events.some(e => e.id === event1.id);

    logTest('Multi-Tenant Event Isolation', isolationValid,
      `College 1 events: ${college1Events.length}, College 2 events: ${college2Events.length}`);

    // Clean up
    await prisma.event.delete({ where: { id: event1.id } });
    await prisma.event.delete({ where: { id: event2.id } });
    
    return isolationValid;
  } catch (error) {
    logTest('Multi-Tenant Isolation', false, error.message);
    return false;
  }
}

async function testNotificationStatusFlow() {
  logSection('Testing Notification Status Flow');
  
  try {
    const college = await prisma.college.findFirst();
    const user = await prisma.user.findFirst({ where: { collegeId: college.id } });
    
    // Create a notification
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Status Flow Test',
        message: 'Testing notification status changes',
        type: 'INFO',
        channel: 'EMAIL',
        status: 'PENDING',
        collegeId: college.id
      }
    });

    // Test status updates
    await prisma.notification.update({
      where: { id: notification.id },
      data: { 
        status: 'SENT',
        sentAt: new Date()
      }
    });

    await prisma.notification.update({
      where: { id: notification.id },
      data: { 
        status: 'DELIVERED',
        deliveredAt: new Date()
      }
    });

    await prisma.notification.update({
      where: { id: notification.id },
      data: { 
        status: 'READ',
        readAt: new Date()
      }
    });

    // Verify final status
    const updatedNotification = await prisma.notification.findUnique({
      where: { id: notification.id }
    });

    const statusFlowValid = updatedNotification.status === 'READ' &&
                           updatedNotification.sentAt &&
                           updatedNotification.deliveredAt &&
                           updatedNotification.readAt;

    logTest('Notification Status Flow', statusFlowValid,
      `Final status: ${updatedNotification.status}, Sent: ${!!updatedNotification.sentAt}, Delivered: ${!!updatedNotification.deliveredAt}, Read: ${!!updatedNotification.readAt}`);

    // Clean up
    await prisma.notification.delete({ where: { id: notification.id } });
    
    return statusFlowValid;
  } catch (error) {
    logTest('Notification Status Flow', false, error.message);
    return false;
  }
}

async function testEventPriorityAndRecurring() {
  logSection('Testing Event Priority and Recurring Features');
  
  try {
    const college = await prisma.college.findFirst();
    
    // Test high priority event
    const highPriorityEvent = await prisma.event.create({
      data: {
        title: 'High Priority Event',
        description: 'Urgent event',
        type: 'EXAM',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: 'URGENT',
        collegeId: college.id,
        isActive: true
      }
    });

    // Test recurring event
    const recurringEvent = await prisma.event.create({
      data: {
        title: 'Recurring Event',
        description: 'Weekly recurring event',
        type: 'OTHER',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: 'MEDIUM',
        isRecurring: true,
        recurrencePattern: '0 9 * * 1', // Every Monday at 9 AM
        collegeId: college.id,
        isActive: true
      }
    });

    const priorityValid = highPriorityEvent.priority === 'URGENT';
    const recurringValid = recurringEvent.isRecurring === true && 
                          recurringEvent.recurrencePattern === '0 9 * * 1';

    logTest('Event Priority', priorityValid, `Priority: ${highPriorityEvent.priority}`);
    logTest('Event Recurring Pattern', recurringValid, `Recurring: ${recurringEvent.isRecurring}, Pattern: ${recurringEvent.recurrencePattern}`);

    // Clean up
    await prisma.event.delete({ where: { id: highPriorityEvent.id } });
    await prisma.event.delete({ where: { id: recurringEvent.id } });
    
    return priorityValid && recurringValid;
  } catch (error) {
    logTest('Event Priority and Recurring', false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Event Management and Notification Tests...\n');
  
  try {
    await testEventCreation();
    await testNotificationCreation();
    await testEventSubscription();
    await testEventReminder();
    await testMultiTenantIsolation();
    await testNotificationStatusFlow();
    await testEventPriorityAndRecurring();
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  } finally {
    logSummary();
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = {
  testEventCreation,
  testNotificationCreation,
  testEventSubscription,
  testEventReminder,
  testMultiTenantIsolation,
  testNotificationStatusFlow,
  testEventPriorityAndRecurring,
  runAllTests
};
