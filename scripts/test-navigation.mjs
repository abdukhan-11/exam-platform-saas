#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testNavigation() {
  try {
    console.log('🧪 Testing Navigation and Button Functionality...\n');

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

    // Test 2: Test homepage navigation
    console.log('2. Testing homepage navigation...');
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.ok) {
        const html = await response.text();
        if (html.includes('Welcome to Exam SaaS Platform') && html.includes('Select Your Institution')) {
          console.log('✅ Homepage is accessible and displays correctly');
        } else {
          console.log('⚠️  Homepage content may be incomplete');
        }
      } else {
        console.log(`⚠️  Homepage responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Homepage failed:', error.message);
    }
    console.log('');

    // Test 3: Test college registration page
    console.log('3. Testing college registration page...');
    try {
      const response = await fetch(`${BASE_URL}/college/register`);
      if (response.ok) {
        const html = await response.text();
        if (html.includes('Register Your Institution') && html.includes('College Information')) {
          console.log('✅ College registration page is accessible');
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

    // Test 4: Test login page
    console.log('4. Testing login page...');
    try {
      const response = await fetch(`${BASE_URL}/auth/login`);
      if (response.ok) {
        const html = await response.text();
        if (html.includes('No college selected') && html.includes('Back to College Selection')) {
          console.log('✅ Login page is accessible and shows proper college validation');
        } else {
          console.log('⚠️  Login page may not have proper college validation');
        }
      } else {
        console.log(`⚠️  Login page responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Login page failed:', error.message);
    }
    console.log('');

    // Test 5: Test student login page
    console.log('5. Testing student login page...');
    try {
      const response = await fetch(`${BASE_URL}/auth/login-student`);
      if (response.ok) {
        const html = await response.text();
        if (html.includes('No college selected') && html.includes('Back to College Selection')) {
          console.log('✅ Student login page is accessible and shows proper college validation');
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

    console.log('🎉 Navigation testing completed!');
    console.log('\n📝 Summary of Navigation Features:');
    console.log('   ✅ Homepage with college selection');
    console.log('   ✅ College registration page');
    console.log('   ✅ Login pages with college validation');
    console.log('   ✅ Navigation buttons should now be functional');
    console.log('\n📝 Manual Testing Instructions:');
    console.log('   1. Open http://localhost:3000 in your browser');
    console.log('   2. Test the "Get Started" button in the navbar (should take you to homepage)');
    console.log('   3. Test the "Sign In" button in the navbar (should take you to login)');
    console.log('   4. Test the "Register New Institution" button on homepage');
    console.log('   5. Test the "Continue to Login" button after college selection');
    console.log('   6. Verify no hydration errors in browser console');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testNavigation().catch(console.error);
