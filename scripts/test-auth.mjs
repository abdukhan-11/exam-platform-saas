#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testAuth() {
  try {
    console.log('🧪 Testing Authentication System...\n');

    // Test 1: Check if database is accessible
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    // Test 2: Check if colleges exist
    console.log('2. Testing college data...');
    const colleges = await prisma.college.findMany({
      take: 5,
      select: { id: true, name: true, username: true, isActive: true }
    });
    
    if (colleges.length === 0) {
      console.log('⚠️  No colleges found in database');
      console.log('   You may need to run: npm run prisma:seed');
    } else {
      console.log(`✅ Found ${colleges.length} colleges:`);
      colleges.forEach(college => {
        console.log(`   - ${college.name} (${college.username}) - ${college.isActive ? 'Active' : 'Inactive'}`);
      });
    }
    console.log('');

    // Test 3: Check if users exist
    console.log('3. Testing user data...');
    const users = await prisma.user.findMany({
      take: 5,
      select: { id: true, name: true, email: true, role: true, collegeId: true, isActive: true }
    });
    
    if (users.length === 0) {
      console.log('⚠️  No users found in database');
      console.log('   You may need to run: npm run prisma:seed');
    } else {
      console.log(`✅ Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role} - College: ${user.collegeId || 'None'}`);
      });
    }
    console.log('');

    // Test 4: Check if super admins exist
    console.log('4. Testing super admin data...');
    const superAdmins = await prisma.superAdmin.findMany({
      take: 3,
      select: { id: true, name: true, email: true, isActive: true }
    });
    
    if (superAdmins.length === 0) {
      console.log('⚠️  No super admins found in database');
      console.log('   You may need to run: npm run prisma:seed');
    } else {
      console.log(`✅ Found ${superAdmins.length} super admins:`);
      superAdmins.forEach(admin => {
        console.log(`   - ${admin.name} (${admin.email}) - ${admin.isActive ? 'Active' : 'Inactive'}`);
      });
    }
    console.log('');

    // Test 5: Test password hashing
    console.log('5. Testing password hashing...');
    const testPassword = 'test123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const isMatch = await bcrypt.compare(testPassword, hashedPassword);
    
    if (isMatch) {
      console.log('✅ Password hashing and verification working');
    } else {
      console.log('❌ Password hashing failed');
    }
    console.log('');

    // Test 6: Test college username resolution
    console.log('6. Testing college username resolution...');
    if (colleges.length > 0) {
      const testCollege = colleges[0];
      const foundCollege = await prisma.college.findUnique({
        where: { username: testCollege.username, isActive: true },
        select: { id: true, name: true, username: true, isActive: true }
      });
      
      if (foundCollege) {
        console.log(`✅ College resolution working for: ${foundCollege.name} (${foundCollege.username})`);
      } else {
        console.log(`❌ College resolution failed for: ${testCollege.username}`);
      }
    } else {
      console.log('⚠️  Skipping college resolution test - no colleges available');
    }
    console.log('');

    // Test 7: Test user authentication queries
    console.log('7. Testing user authentication queries...');
    if (users.length > 0 && colleges.length > 0) {
      const testUser = users[0];
      const testCollege = colleges[0];
      
      const foundUser = await prisma.user.findFirst({
        where: { 
          email: testUser.email,
          collegeId: testUser.collegeId || testCollege.id,
          isActive: true
        }
      });
      
      if (foundUser) {
        console.log(`✅ User authentication query working for: ${foundUser.name} (${foundUser.email})`);
      } else {
        console.log(`❌ User authentication query failed for: ${testUser.email}`);
      }
    } else {
      console.log('⚠️  Skipping user authentication test - insufficient data');
    }
    console.log('');

    console.log('🎉 Authentication system test completed!');
    
    if (colleges.length === 0 || users.length === 0) {
      console.log('\n📝 Next steps:');
      console.log('   1. Run: npm run prisma:seed');
      console.log('   2. Start the development server: npm run dev');
      console.log('   3. Test the login forms at /auth/login and /auth/login-student');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAuth().catch(console.error);


