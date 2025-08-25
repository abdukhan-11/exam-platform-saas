#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testAuthEndpoints() {
  try {
    console.log('🧪 Testing Authentication Endpoints...\n');

    // Test 1: Check if server is running
    console.log('1. Testing server availability...');
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.ok) {
        console.log('✅ Server is running and responding');
      } else {
        console.log(`⚠️  Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Server is not accessible:', error.message);
      return;
    }
    console.log('');

    // Test 2: Test college resolution endpoint
    console.log('2. Testing college resolution endpoint...');
    try {
      const response = await fetch(`${BASE_URL}/api/auth/resolve-college`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collegeUsername: 'test-college' }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ College resolution endpoint working');
        console.log(`   Response: ${JSON.stringify(data)}`);
      } else {
        console.log(`⚠️  College resolution endpoint responded with status: ${response.status}`);
        const errorText = await response.text();
        console.log(`   Error: ${errorText}`);
      }
    } catch (error) {
      console.log('❌ College resolution endpoint failed:', error.message);
    }
    console.log('');

    // Test 3: Test login page accessibility
    console.log('3. Testing login page accessibility...');
    try {
      const response = await fetch(`${BASE_URL}/auth/login`);
      if (response.ok) {
        console.log('✅ Main login page is accessible');
      } else {
        console.log(`⚠️  Main login page responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Main login page failed:', error.message);
    }

    try {
      const response = await fetch(`${BASE_URL}/auth/login-student`);
      if (response.ok) {
        console.log('✅ Student login page is accessible');
      } else {
        console.log(`⚠️  Student login page responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Student login page failed:', error.message);
    }
    console.log('');

    // Test 4: Test NextAuth endpoints
    console.log('4. Testing NextAuth endpoints...');
    try {
      const response = await fetch(`${BASE_URL}/api/auth/session`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ NextAuth session endpoint working');
        console.log(`   Response: ${JSON.stringify(data)}`);
      } else {
        console.log(`⚠️  NextAuth session endpoint responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ NextAuth session endpoint failed:', error.message);
    }
    console.log('');

    console.log('🎉 Authentication endpoint testing completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Set up your .env file with proper database credentials');
    console.log('   2. Run: npm run prisma:seed');
    console.log('   3. Test the authentication forms in your browser');
    console.log('   4. Verify college username resolution works');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAuthEndpoints().catch(console.error);
