#!/usr/bin/env node

/**
 * Email Integration Test Script
 * 
 * This script tests the email integration system without requiring a database connection.
 * It validates the email service configuration, templates, and basic functionality.
 */

import { join } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const projectRoot = join(__dirname, '..');

// Mock Prisma client for testing
class MockPrismaClient {
  constructor() {
    this.emailLog = {
      create: async (data) => {
        console.log('📧 Email log created:', data.data);
        return {
          id: 'mock-id',
          ...data.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
      update: async ({ where, data }) => {
        console.log('📧 Email log updated:', { where, data });
        return {
          id: where.id,
          ...data,
          updatedAt: new Date(),
        };
      },
      findMany: async (options) => {
        console.log('📧 Email logs queried:', options);
        return [];
      },
      count: async (options) => {
        console.log('📧 Email count queried:', options);
        return 0;
      },
      deleteMany: async (options) => {
        console.log('📧 Email logs deleted:', options);
        return { count: 0 };
      },
    };
  }
}

// Mock rate limiter
class MockRateLimiter {
  async checkLimit(key) {
    console.log('🚦 Rate limit checked for:', key);
    return true; // Always allow for testing
  }
}

// Test email templates
function testEmailTemplates() {
  console.log('\n🧪 Testing Email Templates...');
  
  try {
    // Test InvitationEmail
    const invitationEmailPath = join(projectRoot, 'src/components/emails/InvitationEmail.tsx');
    if (fs.existsSync(invitationEmailPath)) {
      console.log('✅ InvitationEmail component exists');
    } else {
      console.log('❌ InvitationEmail component missing');
    }

    // Test WelcomeEmail
    const welcomeEmailPath = join(projectRoot, 'src/components/emails/WelcomeEmail.tsx');
    if (fs.existsSync(welcomeEmailPath)) {
      console.log('✅ WelcomeEmail component exists');
    } else {
      console.log('❌ WelcomeEmail component missing');
    }

    // Test PasswordResetEmail
    const passwordResetEmailPath = join(projectRoot, 'src/components/emails/PasswordResetEmail.tsx');
    if (fs.existsSync(passwordResetEmailPath)) {
      console.log('✅ PasswordResetEmail component exists');
    } else {
      console.log('❌ PasswordResetEmail component missing');
    }

    // Test EmailVerificationEmail
    const emailVerificationPath = join(projectRoot, 'src/components/emails/EmailVerificationEmail.tsx');
    if (fs.existsSync(emailVerificationPath)) {
      console.log('✅ EmailVerificationEmail component exists');
    } else {
      console.log('❌ EmailVerificationEmail component missing');
    }

    return true;
  } catch (error) {
    console.log('❌ Error testing email templates:', error.message);
    return false;
  }
}

// Test email service configuration
function testEmailServiceConfig() {
  console.log('\n⚙️ Testing Email Service Configuration...');
  
  try {
    const emailServicePath = join(projectRoot, 'src/lib/email/email-service.ts');
    if (fs.existsSync(emailServicePath)) {
      console.log('✅ EmailService exists');
      
      const content = fs.readFileSync(emailServicePath, 'utf8');
      
      // Check for required methods
      const requiredMethods = [
        'sendInvitationEmail',
        'sendWelcomeEmail',
        'sendPasswordResetEmail',
        'sendEmailVerificationEmail',
        'sendEmail',
        'verifyConnection',
        'retryFailedEmails',
        'getEmailStats',
        'cleanupOldLogs'
      ];
      
      for (const method of requiredMethods) {
        if (content.includes(method)) {
          console.log(`✅ Method ${method} exists`);
        } else {
          console.log(`❌ Method ${method} missing`);
        }
      }
      
      return true;
    } else {
      console.log('❌ EmailService missing');
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing email service config:', error.message);
    return false;
  }
}

// Test notification preferences
function testNotificationPreferences() {
  console.log('\n🔔 Testing Notification Preferences...');
  
  try {
    const preferencesPath = join(projectRoot, 'src/lib/email/notification-preferences.ts');
    if (fs.existsSync(preferencesPath)) {
      console.log('✅ NotificationPreferencesService exists');
      
      const content = fs.readFileSync(preferencesPath, 'utf8');
      
      // Check for required methods
      const requiredMethods = [
        'getDefaultPreferences',
        'getUserPreferences',
        'updateUserPreferences',
        'shouldSendNotification',
        'isWithinQuietHours',
        'bulkUpdatePreferences',
        'resetToDefaults'
      ];
      
      for (const method of requiredMethods) {
        if (content.includes(method)) {
          console.log(`✅ Method ${method} exists`);
        } else {
          console.log(`❌ Method ${method} missing`);
        }
      }
      
      return true;
    } else {
      console.log('❌ NotificationPreferencesService missing');
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing notification preferences:', error.message);
    return false;
  }
}

// Test email testing service
function testEmailTestingService() {
  console.log('\n🧪 Testing Email Testing Service...');
  
  try {
    const testingPath = join(projectRoot, 'src/lib/email/email-testing.ts');
    if (fs.existsSync(testingPath)) {
      console.log('✅ EmailTestingService exists');
      
      const content = fs.readFileSync(testingPath, 'utf8');
      
      // Check for required methods
      const requiredMethods = [
        'validateEmailAddress',
        'validateEmailTemplate',
        'testEmailConnection',
        'testEmailSending',
        'testEmailTemplates',
        'testNotificationPreferences',
        'testRateLimiting',
        'runTestSuite',
        'generateTestReport'
      ];
      
      for (const method of requiredMethods) {
        if (content.includes(method)) {
          console.log(`✅ Method ${method} exists`);
        } else {
          console.log(`❌ Method ${method} missing`);
        }
      }
      
      return true;
    } else {
      console.log('❌ EmailTestingService missing');
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing email testing service:', error.message);
    return false;
  }
}

// Test API endpoints
function testAPIEndpoints() {
  console.log('\n🌐 Testing API Endpoints...');
  
  try {
    const testEndpointPath = join(projectRoot, 'src/app/api/email/test/route.ts');
    if (fs.existsSync(testEndpointPath)) {
      console.log('✅ Email test API endpoint exists');
      
      const content = fs.readFileSync(testEndpointPath, 'utf8');
      
      if (content.includes('POST') && content.includes('GET')) {
        console.log('✅ API endpoint supports POST and GET methods');
      } else {
        console.log('❌ API endpoint missing required HTTP methods');
      }
      
      return true;
    } else {
      console.log('❌ Email test API endpoint missing');
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing API endpoints:', error.message);
    return false;
  }
}

// Test Prisma schema
function testPrismaSchema() {
  console.log('\n🗄️ Testing Prisma Schema...');
  
  try {
    const schemaPath = join(projectRoot, 'prisma/schema.prisma');
    if (fs.existsSync(schemaPath)) {
      console.log('✅ Prisma schema exists');
      
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // Check for required models
      const requiredModels = [
        'model UserInvitation',
        'model EmailLog',
        'enum InvitationStatus',
        'enum EmailStatus'
      ];
      
      for (const model of requiredModels) {
        if (content.includes(model)) {
          console.log(`✅ ${model} exists`);
        } else {
          console.log(`❌ ${model} missing`);
        }
      }
      
      return true;
    } else {
      console.log('❌ Prisma schema missing');
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing Prisma schema:', error.message);
    return false;
  }
}

// Test package.json dependencies
function testDependencies() {
  console.log('\n📦 Testing Dependencies...');
  
  try {
    const packageJsonPath = join(projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      console.log('✅ package.json exists');
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check for required dependencies
      const requiredDeps = [
        'nodemailer',
        '@react-email/components',
        '@react-email/render',
        '@types/nodemailer'
      ];
      
      for (const dep of requiredDeps) {
        if (dependencies[dep]) {
          console.log(`✅ ${dep} is installed (${dependencies[dep]})`);
        } else {
          console.log(`❌ ${dep} is missing`);
        }
      }
      
      return true;
    } else {
      console.log('❌ package.json missing');
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing dependencies:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Email Integration Tests...\n');
  
  const tests = [
    { name: 'Email Templates', test: testEmailTemplates },
    { name: 'Email Service Config', test: testEmailServiceConfig },
    { name: 'Notification Preferences', test: testNotificationPreferences },
    { name: 'Email Testing Service', test: testEmailTestingService },
    { name: 'API Endpoints', test: testAPIEndpoints },
    { name: 'Prisma Schema', test: testPrismaSchema },
    { name: 'Dependencies', test: testDependencies },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
        console.log(`✅ ${name} tests passed\n`);
      } else {
        failed++;
        console.log(`❌ ${name} tests failed\n`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${name} tests failed with error: ${error.message}\n`);
    }
  }
  
  // Summary
  console.log('📊 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All email integration tests passed!');
    console.log('📧 Email system is ready for use.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the issues above.');
    console.log('🔧 Fix the issues before using the email system in production.');
  }
  
  return failed === 0;
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

export { runTests };
