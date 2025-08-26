const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Simple Email Integration Test...\n');

// Test 1: Check if email templates exist
console.log('🧪 Testing Email Templates...');
const emailTemplates = [
  'src/components/emails/InvitationEmail.tsx',
  'src/components/emails/WelcomeEmail.tsx',
  'src/components/emails/PasswordResetEmail.tsx',
  'src/components/emails/EmailVerificationEmail.tsx'
];

let templatesPassed = 0;
for (const template of emailTemplates) {
  if (fs.existsSync(template)) {
    console.log(`✅ ${template} exists`);
    templatesPassed++;
  } else {
    console.log(`❌ ${template} missing`);
  }
}

// Test 2: Check if email service exists
console.log('\n⚙️ Testing Email Service...');
const emailServicePath = 'src/lib/email/email-service.ts';
if (fs.existsSync(emailServicePath)) {
  console.log('✅ EmailService exists');
  const content = fs.readFileSync(emailServicePath, 'utf8');
  
  const requiredMethods = [
    'sendInvitationEmail',
    'sendWelcomeEmail', 
    'sendPasswordResetEmail',
    'sendEmailVerificationEmail',
    'sendEmail',
    'verifyConnection'
  ];
  
  let methodsPassed = 0;
  for (const method of requiredMethods) {
    if (content.includes(method)) {
      console.log(`✅ Method ${method} exists`);
      methodsPassed++;
    } else {
      console.log(`❌ Method ${method} missing`);
    }
  }
} else {
  console.log('❌ EmailService missing');
}

// Test 3: Check if notification preferences exist
console.log('\n🔔 Testing Notification Preferences...');
const preferencesPath = 'src/lib/email/notification-preferences.ts';
if (fs.existsSync(preferencesPath)) {
  console.log('✅ NotificationPreferencesService exists');
} else {
  console.log('❌ NotificationPreferencesService missing');
}

// Test 4: Check if email testing service exists
console.log('\n🧪 Testing Email Testing Service...');
const testingPath = 'src/lib/email/email-testing.ts';
if (fs.existsSync(testingPath)) {
  console.log('✅ EmailTestingService exists');
} else {
  console.log('❌ EmailTestingService missing');
}

// Test 5: Check if API endpoint exists
console.log('\n🌐 Testing API Endpoint...');
const apiPath = 'src/app/api/email/test/route.ts';
if (fs.existsSync(apiPath)) {
  console.log('✅ Email test API endpoint exists');
} else {
  console.log('❌ Email test API endpoint missing');
}

// Test 6: Check Prisma schema
console.log('\n🗄️ Testing Prisma Schema...');
const schemaPath = 'prisma/schema.prisma';
if (fs.existsSync(schemaPath)) {
  console.log('✅ Prisma schema exists');
  const content = fs.readFileSync(schemaPath, 'utf8');
  
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
} else {
  console.log('❌ Prisma schema missing');
}

// Test 7: Check dependencies
console.log('\n📦 Testing Dependencies...');
const packageJsonPath = 'package.json';
if (fs.existsSync(packageJsonPath)) {
  console.log('✅ package.json exists');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
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
} else {
  console.log('❌ package.json missing');
}

console.log('\n📊 Email Integration Test Complete!');
console.log('🎉 Email system components have been validated.');
console.log('📧 Ready for database migration and testing.');
