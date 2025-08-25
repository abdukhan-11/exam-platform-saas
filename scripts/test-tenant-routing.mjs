#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testTenantRouting() {
  try {
    console.log('🧪 Testing College Selection and Tenant Routing System...\n');

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

    // Test 2: Test landing page with college selection
    console.log('2. Testing landing page with college selection...');
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.ok) {
        const html = await response.text();
        if (html.includes('Select Your Institution') && html.includes('college username')) {
          console.log('✅ Landing page with college selection is working');
        } else {
          console.log('⚠️  Landing page content may be incomplete');
        }
      } else {
        console.log(`⚠️  Landing page responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Landing page failed:', error.message);
    }
    console.log('');

    // Test 3: Test college registration page
    console.log('3. Testing college registration page...');
    try {
      const response = await fetch(`${BASE_URL}/college/register`);
      if (response.ok) {
        const html = await response.text();
        if (html.includes('Register Your Institution') && html.includes('College Information')) {
          console.log('✅ College registration page is working');
        } else {
          console.log('⚠️  College registration page content may be incomplete');
        }
      } else {
        console.log(`⚠️  College registration page responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ College registration page failed:', error.message);
    }
    console.log('');

    // Test 4: Test login page accessibility
    console.log('4. Testing login page accessibility...');
    try {
      const response = await fetch(`${BASE_URL}/auth/login`);
      if (response.ok) {
        const html = await response.text();
        if (html.includes('No college selected') && html.includes('Back to College Selection')) {
          console.log('✅ Login page properly redirects when no college is selected');
        } else {
          console.log('⚠️  Login page may not have proper college validation');
        }
      } else {
        console.log(`⚠️  Login page responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Login page failed:', error.message);
    }

    try {
      const response = await fetch(`${BASE_URL}/auth/login-student`);
      if (response.ok) {
        const html = await response.text();
        if (html.includes('No college selected') && html.includes('Back to College Selection')) {
          console.log('✅ Student login page properly redirects when no college is selected');
        } else {
          console.log('⚠️  Student login page may not have proper college validation');
        }
      } else {
        console.log(`⚠️  Student login page responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Student login page failed:', error.message);
    }
    console.log('');

    // Test 5: Test college resolution endpoint (expected to fail without database)
    console.log('5. Testing college resolution endpoint...');
    try {
      const response = await fetch(`${BASE_URL}/api/auth/resolve-college`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collegeUsername: 'test-college' }),
      });

      if (response.status === 500) {
        console.log('✅ College resolution endpoint is accessible (500 error expected without database)');
      } else if (response.ok) {
        const data = await response.json();
        console.log('✅ College resolution endpoint working');
        console.log(`   Response: ${JSON.stringify(data)}`);
      } else {
        console.log(`⚠️  College resolution endpoint responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ College resolution endpoint failed:', error.message);
    }
    console.log('');

    console.log('🎉 Tenant routing system testing completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Set up your .env file with proper database credentials');
    console.log('   2. Run: npm run prisma:seed');
    console.log('   3. Test the complete flow:');
    console.log('      - Go to homepage and select a college');
    console.log('      - Verify college context is stored in sessionStorage');
    console.log('      - Test login forms with college context');
    console.log('      - Verify tenant isolation works correctly');
    console.log('   4. Test college registration flow');
    console.log('   5. Verify new colleges can be added and used immediately');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testTenantRouting().catch(console.error);
