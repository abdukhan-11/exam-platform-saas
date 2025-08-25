const { PrismaClient } = require('@prisma/client');

/**
 * Comprehensive Database Testing Framework for Exam Platform
 * Tests all database operations, relationships, and constraints
 */

const prisma = new PrismaClient();

// Test configuration
const testConfig = {
  verbose: true,
  stopOnError: false,
  maxRetries: 3
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: []
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, message = '') {
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`${statusIcon} ${testName}: ${message}`, statusColor);
}

function logSection(title) {
  log(`\n${colors.bright}${colors.cyan}${title}${colors.reset}`);
  log('='.repeat(title.length));
}

function logSummary() {
  logSection('TEST SUMMARY');
  log(`Total Tests: ${testResults.total}`, 'bright');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, 'red');
  
  if (testResults.errors.length > 0) {
    log('\nErrors:', 'red');
    testResults.errors.forEach((error, index) => {
      log(`${index + 1}. ${error.test}: ${error.message}`, 'red');
    });
  }
}

// Test runner
async function runTest(testName, testFunction) {
  testResults.total++;
  
  try {
    await testFunction();
    testResults.passed++;
    logTest(testName, 'PASS');
    return true;
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({
      test: testName,
      message: error.message
    });
    logTest(testName, 'FAIL', error.message);
    
    if (testConfig.stopOnError) {
      throw error;
    }
    return false;
  }
}

// Database connection tests
async function testDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
}

async function testPrismaClientGeneration() {
  // Test that all models are accessible
  const models = [
    'superAdmin', 'college', 'user', 'subject', 'class', 'exam',
    'question', 'questionOption', 'examResult', 'enrollment',
    'teacherClassAssignment', 'studentProfile', 'studentExamAttempt',
    'studentAnswer', 'event', 'refreshToken'
  ];
  
  for (const model of models) {
    if (!prisma[model]) {
      throw new Error(`Model ${model} not accessible`);
    }
  }
}

// Data integrity tests
async function testDataIntegrity() {
  // Test that all colleges have unique codes
  const colleges = await prisma.college.findMany();
  const codes = colleges.map(c => c.code);
  const uniqueCodes = new Set(codes);
  
  if (codes.length !== uniqueCodes.size) {
    throw new Error('College codes are not unique');
  }
  
  // Test that all users have unique emails within their college
  for (const college of colleges) {
    const users = await prisma.user.findMany({
      where: { collegeId: college.id }
    });
    
    const emails = users.map(u => u.email);
    const uniqueEmails = new Set(emails);
    
    if (emails.length !== uniqueEmails.size) {
      throw new Error(`User emails are not unique in college ${college.name}`);
    }
  }
}

// Relationship tests
async function testRelationships() {
  // Test college-user relationships
  const colleges = await prisma.college.findMany({
    include: { users: true }
  });
  
  for (const college of colleges) {
    if (college.users.length === 0) {
      throw new Error(`College ${college.name} has no users`);
    }
    
    // Verify all users belong to the college
    for (const user of college.users) {
      if (user.collegeId !== college.id) {
        throw new Error(`User ${user.email} collegeId mismatch`);
      }
    }
  }
  
  // Test class-subject relationships
  const classes = await prisma.class.findMany({
    include: { subjects: true }
  });
  
  for (const classData of classes) {
    for (const subject of classData.subjects) {
      if (subject.collegeId !== classData.collegeId) {
        throw new Error(`Subject ${subject.name} collegeId mismatch with class ${classData.name}`);
      }
    }
  }
  
  // Test exam-question relationships
  const exams = await prisma.exam.findMany({
    include: { questions: true }
  });
  
  for (const exam of exams) {
    if (exam.questions.length === 0) {
      throw new Error(`Exam ${exam.title} has no questions`);
    }
    
    for (const question of exam.questions) {
      if (question.examId !== exam.id) {
        throw new Error(`Question ${question.id} examId mismatch`);
      }
    }
  }
}

// Multi-tenant isolation tests
async function testMultiTenantIsolation() {
  const colleges = await prisma.college.findMany();
  
  if (colleges.length < 2) {
    log('⚠️  Multi-tenant isolation test skipped (need at least 2 colleges)', 'yellow');
    return;
  }
  
  const college1 = colleges[0];
  const college2 = colleges[1];
  
  // Test that users from different colleges are isolated
  const users1 = await prisma.user.findMany({
    where: { collegeId: college1.id }
  });
  
  const users2 = await prisma.user.findMany({
    where: { collegeId: college2.id }
  });
  
  // Verify no cross-college data
  for (const user1 of users1) {
    if (user1.collegeId === college2.id) {
      throw new Error(`User ${user1.email} has wrong collegeId`);
    }
  }
  
  for (const user2 of users2) {
    if (user2.collegeId === college1.id) {
      throw new Error(`User ${user2.email} has wrong collegeId`);
    }
  }
  
  // Test that subjects are isolated
  const subjects1 = await prisma.subject.findMany({
    where: { collegeId: college1.id }
  });
  
  const subjects2 = await prisma.subject.findMany({
    where: { collegeId: college2.id }
  });
  
  for (const subject1 of subjects1) {
    if (subject1.collegeId === college2.id) {
      throw new Error(`Subject ${subject1.name} has wrong collegeId`);
    }
  }
}

// Performance tests
async function testPerformance() {
  // Test query performance for common operations
  
  // Test college listing
  const startTime = Date.now();
  const colleges = await prisma.college.findMany({
    include: {
      users: {
        where: { isActive: true }
      }
    }
  });
  const collegeQueryTime = Date.now() - startTime;
  
  if (collegeQueryTime > 1000) {
    throw new Error(`College query took too long: ${collegeQueryTime}ms`);
  }
  
  // Test user listing with filters
  const userStartTime = Date.now();
  const users = await prisma.user.findMany({
    where: { isActive: true },
    include: { college: true }
  });
  const userQueryTime = Date.now() - userStartTime;
  
  if (userQueryTime > 1000) {
    throw new Error(`User query took too long: ${userQueryTime}ms`);
  }
  
  // Test exam listing with relationships
  const examStartTime = Date.now();
  const exams = await prisma.exam.findMany({
    where: { isActive: true },
    include: {
      subject: true,
      class: true,
      questions: {
        include: { options: true }
      }
    }
  });
  const examQueryTime = Date.now() - examStartTime;
  
  if (examQueryTime > 2000) {
    throw new Error(`Exam query took too long: ${examQueryTime}ms`);
  }
  
  log(`✅ Performance tests passed - College: ${collegeQueryTime}ms, User: ${userQueryTime}ms, Exam: ${examQueryTime}ms`, 'green');
}

// Anti-cheating feature tests
async function testAntiCheatingFeatures() {
  const exams = await prisma.exam.findMany({
    where: { isActive: true }
  });
  
  if (exams.length === 0) {
    log('⚠️  Anti-cheating tests skipped (no active exams)', 'yellow');
    return;
  }
  
  const exam = exams[0];
  
  // Test that anti-cheating fields exist
  if (typeof exam.enableQuestionShuffling !== 'boolean') {
    throw new Error('enableQuestionShuffling field missing or invalid');
  }
  
  if (typeof exam.enableBrowserLock !== 'boolean') {
    throw new Error('enableBrowserLock field missing or invalid');
  }
  
  if (typeof exam.enableFullscreenMode !== 'boolean') {
    throw new Error('enableFullscreenMode field missing or invalid');
  }
  
  if (typeof exam.maxAttempts !== 'number') {
    throw new Error('maxAttempts field missing or invalid');
  }
  
  // Test exam attempt creation with anti-cheating data
  const users = await prisma.user.findMany({
    where: { role: 'STUDENT', collegeId: exam.collegeId }
  });
  
  if (users.length > 0) {
    const student = users[0];
    
    const attempt = await prisma.studentExamAttempt.create({
      data: {
        userId: student.id,
        examId: exam.id,
        startedAt: new Date(),
        score: 0,
        totalMarks: 100,
        isCompleted: false,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        browserFingerprint: 'test-fingerprint-123',
        suspiciousActivity: false,
        activityLog: JSON.stringify(['Test activity']),
        violationCount: 0
      }
    });
    
    if (!attempt.id) {
      throw new Error('Failed to create exam attempt');
    }
    
    // Clean up test data
    await prisma.studentExamAttempt.delete({
      where: { id: attempt.id }
    });
  }
}

// Data validation tests
async function testDataValidation() {
  // Test enum values
  const validRoles = ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'STUDENT'];
  const validQuestionTypes = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY'];
  const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
  
  // Test user role validation
  const users = await prisma.user.findMany();
  for (const user of users) {
    if (!validRoles.includes(user.role)) {
      throw new Error(`Invalid user role: ${user.role}`);
    }
  }
  
  // Test question type validation
  const questions = await prisma.question.findMany();
  for (const question of questions) {
    if (!validQuestionTypes.includes(question.type)) {
      throw new Error(`Invalid question type: ${question.type}`);
    }
    
    if (!validDifficulties.includes(question.difficulty)) {
      throw new Error(`Invalid question difficulty: ${question.difficulty}`);
    }
  }
  
  // Test subscription status validation
  const colleges = await prisma.college.findMany();
  for (const college of colleges) {
    if (!['TRIAL', 'ACTIVE', 'EXPIRED'].includes(college.subscriptionStatus)) {
      throw new Error(`Invalid subscription status: ${college.subscriptionStatus}`);
    }
  }
}

// Index and constraint tests
async function testIndexesAndConstraints() {
  // Test unique constraints
  try {
    // Try to create a duplicate college code
    await prisma.college.create({
      data: {
        code: 'DUPLICATE-CODE',
        name: 'Duplicate College',
        country: 'Pakistan'
      }
    });
    
    // If we get here, the unique constraint failed
    throw new Error('College code unique constraint not working');
  } catch (error) {
    if (error.code === 'P2002') {
      // Expected error for duplicate
      log('✅ Unique constraint test passed', 'green');
    } else {
      throw error;
    }
  }
  
  // Test foreign key constraints
  try {
    // Try to create a user with non-existent collegeId
    await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@nonexistent.edu',
        password: 'password',
        role: 'STUDENT',
        collegeId: 'non-existent-college-id'
      }
    });
    
    // If we get here, the foreign key constraint failed
    throw new Error('Foreign key constraint not working');
  } catch (error) {
    if (error.code === 'P2003') {
      // Expected error for foreign key violation
      log('✅ Foreign key constraint test passed', 'green');
    } else {
      throw error;
    }
  }
}

// Main test runner
async function runAllTests() {
  logSection('DATABASE TESTING FRAMEWORK');
  log('Starting comprehensive database tests...\n');
  
  try {
    // Basic tests
    await runTest('Database Connection', testDatabaseConnection);
    await runTest('Prisma Client Generation', testPrismaClientGeneration);
    
    // Data integrity tests
    await runTest('Data Integrity', testDataIntegrity);
    await runTest('Relationships', testRelationships);
    await runTest('Multi-Tenant Isolation', testMultiTenantIsolation);
    
    // Feature tests
    await runTest('Performance', testPerformance);
    await runTest('Anti-Cheating Features', testAntiCheatingFeatures);
    
    // Validation tests
    await runTest('Data Validation', testDataValidation);
    await runTest('Indexes and Constraints', testIndexesAndConstraints);
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
  } finally {
    logSummary();
    
    // Clean up
    await prisma.$disconnect();
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runTest,
  runAllTests,
  testResults
};
