const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Test configuration
const TEST_CONFIG = {
  testCollegeId: 'test-college-123',
  testUserId: 'test-user-123',
  testAdminId: 'test-admin-123',
};

// Test data
const testData = {
  college: {
    id: TEST_CONFIG.testCollegeId,
    name: 'Test College',
    college_username: 'testcollege',
    email: 'admin@testcollege.edu',
    phone: '1234567890',
    address: '123 Test Street',
    isActive: true,
  },
  admin: {
    id: TEST_CONFIG.testAdminId,
    email: 'admin@testcollege.edu',
    password: 'admin123',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'COLLEGE_ADMIN',
    collegeId: TEST_CONFIG.testCollegeId,
    isActive: true,
  },
  student: {
    id: TEST_CONFIG.testUserId,
    rollNo: 'STU001',
    password: 'student123',
    firstName: 'Test',
    lastName: 'Student',
    role: 'STUDENT',
    collegeId: TEST_CONFIG.testCollegeId,
    isActive: true,
  },
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: [],
};

// Utility functions
function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ PASSED: ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ FAILED: ${testName} - ${details}`);
  }
  testResults.details.push({ testName, passed, details });
}

async function setupTestData() {
  console.log('🔧 Setting up test data...');
  
  try {
    // Create test college
    await prisma.college.upsert({
      where: { id: testData.college.id },
      update: testData.college,
      create: testData.college,
    });

    // Create test admin
    const hashedAdminPassword = await bcrypt.hash(testData.admin.password, 12);
    await prisma.user.upsert({
      where: { id: testData.admin.id },
      update: { ...testData.admin, password: hashedAdminPassword },
      create: { ...testData.admin, password: hashedAdminPassword },
    });

    // Create test student
    const hashedStudentPassword = await bcrypt.hash(testData.student.password, 12);
    await prisma.user.upsert({
      where: { id: testData.student.id },
      update: { ...testData.student, password: hashedStudentPassword },
      create: { ...testData.student, password: hashedStudentPassword },
    });

    console.log('✅ Test data setup completed');
  } catch (error) {
    console.error('❌ Failed to setup test data:', error);
    throw error;
  }
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testData.admin.id, testData.student.id],
        },
      },
    });

    await prisma.college.deleteMany({
      where: {
        id: testData.college.id,
      },
    });

    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error);
  }
}

// Test functions
async function testUserService() {
  console.log('\n📋 Testing User Management Service...');
  
  try {
    // Test user creation
    const { userManagementService } = require('../src/lib/user-management/user-service');
    
    const newUser = await userManagementService.createUser({
      email: 'newuser@test.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
      role: 'STUDENT',
      collegeId: TEST_CONFIG.testCollegeId,
    });
    
    logTest('User Creation', !!newUser && newUser.id, 'User should be created successfully');
    
    // Test user update
    const updatedUser = await userManagementService.updateUser(newUser.id, {
      firstName: 'Updated',
      lastName: 'User',
    });
    
    logTest('User Update', updatedUser.firstName === 'Updated', 'User should be updated successfully');
    
    // Test user deactivation
    const deactivatedUser = await userManagementService.deactivateUser(newUser.id, TEST_CONFIG.testAdminId);
    
    logTest('User Deactivation', !deactivatedUser.isActive, 'User should be deactivated');
    
    // Test user reactivation
    const reactivatedUser = await userManagementService.reactivateUser(newUser.id, TEST_CONFIG.testAdminId);
    
    logTest('User Reactivation', reactivatedUser.isActive, 'User should be reactivated');
    
    // Test user search
    const searchResults = await userManagementService.getUsers({
      collegeId: TEST_CONFIG.testCollegeId,
      search: 'New',
      page: 1,
      limit: 10,
    });
    
    logTest('User Search', searchResults.users.length > 0, 'Should find users by search term');
    
    // Test user invitation
    const invitation = await userManagementService.createUserInvitation({
      email: 'invited@test.com',
      role: 'TEACHER',
      collegeId: TEST_CONFIG.testCollegeId,
      invitedBy: TEST_CONFIG.testAdminId,
      message: 'Welcome to our college!',
    });
    
    logTest('User Invitation', !!invitation && invitation.email === 'invited@test.com', 'Invitation should be created');
    
    // Test bulk import
    const bulkImportResult = await userManagementService.bulkImportUsers({
      users: [
        {
          firstName: 'Bulk',
          lastName: 'User1',
          role: 'STUDENT',
          rollNo: 'BULK001',
        },
        {
          firstName: 'Bulk',
          lastName: 'User2',
          role: 'STUDENT',
          rollNo: 'BULK002',
        },
      ],
      collegeId: TEST_CONFIG.testCollegeId,
      importedBy: TEST_CONFIG.testAdminId,
    });
    
    logTest('Bulk Import', bulkImportResult.success > 0, 'Bulk import should succeed');
    
    // Cleanup created users
    await prisma.user.deleteMany({
      where: {
        collegeId: TEST_CONFIG.testCollegeId,
        id: {
          not: {
            in: [TEST_CONFIG.testAdminId, TEST_CONFIG.testUserId],
          },
        },
      },
    });
    
  } catch (error) {
    logTest('User Service Tests', false, error.message);
  }
}

async function testPermissionSystem() {
  console.log('\n🔐 Testing Permission System...');
  
  try {
    const { PermissionService, Permission, ROLE_PERMISSIONS } = require('../src/lib/user-management/permissions');
    
    // Test permission checks
    const hasCreatePermission = PermissionService.hasPermission('COLLEGE_ADMIN', Permission.CREATE_USER);
    logTest('Permission Check - College Admin Create User', hasCreatePermission, 'College admin should have create user permission');
    
    const hasSuperAdminPermission = PermissionService.hasPermission('STUDENT', Permission.CREATE_COLLEGE);
    logTest('Permission Check - Student Create College', !hasSuperAdminPermission, 'Student should not have create college permission');
    
    // Test role permissions
    const superAdminPermissions = PermissionService.getRolePermissions('SUPER_ADMIN');
    logTest('Super Admin Permissions', superAdminPermissions.length > 0, 'Super admin should have permissions');
    
    const studentPermissions = PermissionService.getRolePermissions('STUDENT');
    logTest('Student Permissions', studentPermissions.length > 0, 'Student should have some permissions');
    
    // Test college access
    const canAccessOwnCollege = PermissionService.canAccessCollege(
      'COLLEGE_ADMIN',
      TEST_CONFIG.testCollegeId,
      TEST_CONFIG.testCollegeId
    );
    logTest('College Access - Own College', canAccessOwnCollege, 'Should access own college');
    
    const canAccessOtherCollege = PermissionService.canAccessCollege(
      'COLLEGE_ADMIN',
      TEST_CONFIG.testCollegeId,
      'other-college-id'
    );
    logTest('College Access - Other College', !canAccessOtherCollege, 'Should not access other college');
    
    // Test action validation
    const validationResult = PermissionService.validateUserAction({
      userRole: 'COLLEGE_ADMIN',
      userCollegeId: TEST_CONFIG.testCollegeId,
      userId: TEST_CONFIG.testAdminId,
      action: Permission.CREATE_USER,
      resource: {
        collegeId: TEST_CONFIG.testCollegeId,
      },
    });
    
    logTest('Action Validation', validationResult.allowed, 'Action should be allowed');
    
  } catch (error) {
    logTest('Permission System Tests', false, error.message);
  }
}

async function testAPIEndpoints() {
  console.log('\n🌐 Testing API Endpoints...');
  
  try {
    // Note: In a real test environment, you would use a test server
    // For now, we'll test the endpoint logic by importing and testing the functions
    
    // Test user creation endpoint logic
    const { CreateUserSchema } = require('../src/lib/user-management/user-service');
    
    const validUserData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'STUDENT',
      collegeId: TEST_CONFIG.testCollegeId,
    };
    
    const validatedData = CreateUserSchema.parse(validUserData);
    logTest('API Validation - Valid User Data', !!validatedData, 'Valid user data should pass validation');
    
    // Test invalid user data
    try {
      const invalidUserData = {
        email: 'invalid-email',
        password: '123', // Too short
        firstName: '',
        lastName: 'User',
        role: 'STUDENT',
        collegeId: TEST_CONFIG.testCollegeId,
      };
      
      CreateUserSchema.parse(invalidUserData);
      logTest('API Validation - Invalid User Data', false, 'Invalid user data should fail validation');
    } catch (error) {
      logTest('API Validation - Invalid User Data', true, 'Invalid user data correctly rejected');
    }
    
    // Test invitation schema
    const { UserInvitationSchema } = require('../src/lib/user-management/user-service');
    
    const validInvitationData = {
      email: 'invite@example.com',
      role: 'TEACHER',
      collegeId: TEST_CONFIG.testCollegeId,
      invitedBy: TEST_CONFIG.testAdminId,
      message: 'Welcome!',
    };
    
    const validatedInvitation = UserInvitationSchema.parse(validInvitationData);
    logTest('API Validation - Valid Invitation Data', !!validatedInvitation, 'Valid invitation data should pass validation');
    
  } catch (error) {
    logTest('API Endpoints Tests', false, error.message);
  }
}

async function testReactComponents() {
  console.log('\n⚛️ Testing React Components...');
  
  try {
    // Test component imports
    const userListPath = '../src/components/user-management/UserList';
    const createUserDialogPath = '../src/components/user-management/CreateUserDialog';
    const userInviteDialogPath = '../src/components/user-management/UserInviteDialog';
    const bulkImportDialogPath = '../src/components/user-management/BulkImportDialog';
    
    // Check if components exist and can be imported
    try {
      require(userListPath);
      logTest('React Component - UserList', true, 'UserList component exists');
    } catch (error) {
      logTest('React Component - UserList', false, 'UserList component not found');
    }
    
    try {
      require(createUserDialogPath);
      logTest('React Component - CreateUserDialog', true, 'CreateUserDialog component exists');
    } catch (error) {
      logTest('React Component - CreateUserDialog', false, 'CreateUserDialog component not found');
    }
    
    try {
      require(userInviteDialogPath);
      logTest('React Component - UserInviteDialog', true, 'UserInviteDialog component exists');
    } catch (error) {
      logTest('React Component - UserInviteDialog', false, 'UserInviteDialog component not found');
    }
    
    try {
      require(bulkImportDialogPath);
      logTest('React Component - BulkImportDialog', true, 'BulkImportDialog component exists');
    } catch (error) {
      logTest('React Component - BulkImportDialog', false, 'BulkImportDialog component not found');
    }
    
    // Test custom hook
    try {
      require('../src/hooks/useUserManagement');
      logTest('React Hook - useUserManagement', true, 'useUserManagement hook exists');
    } catch (error) {
      logTest('React Hook - useUserManagement', false, 'useUserManagement hook not found');
    }
    
  } catch (error) {
    logTest('React Components Tests', false, error.message);
  }
}

async function testDataIntegrity() {
  console.log('\n🔍 Testing Data Integrity...');
  
  try {
    // Test user-college relationship
    const user = await prisma.user.findUnique({
      where: { id: TEST_CONFIG.testUserId },
      include: { college: true },
    });
    
    logTest('Data Integrity - User-College Relationship', 
      user && user.college && user.college.id === TEST_CONFIG.testCollegeId, 
      'User should be linked to correct college');
    
    // Test role validation
    const validRoles = ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'STUDENT'];
    const userRole = user?.role;
    
    logTest('Data Integrity - Valid Role', 
      validRoles.includes(userRole), 
      'User should have a valid role');
    
    // Test password hashing
    const isPasswordHashed = user?.password && user.password.length > 20;
    logTest('Data Integrity - Password Hashing', 
      isPasswordHashed, 
      'Password should be hashed');
    
    // Test required fields
    const hasRequiredFields = user?.firstName && user?.lastName && user?.collegeId;
    logTest('Data Integrity - Required Fields', 
      hasRequiredFields, 
      'User should have all required fields');
    
  } catch (error) {
    logTest('Data Integrity Tests', false, error.message);
  }
}

async function testSecurityFeatures() {
  console.log('\n🛡️ Testing Security Features...');
  
  try {
    const { PermissionService, Permission } = require('../src/lib/user-management/permissions');
    
    // Test permission escalation prevention
    const studentCannotCreateAdmin = !PermissionService.hasPermission('STUDENT', Permission.CREATE_USER);
    logTest('Security - Permission Escalation Prevention', 
      studentCannotCreateAdmin, 
      'Student should not be able to create users');
    
    // Test college isolation
    const cannotAccessOtherCollege = !PermissionService.canAccessCollege(
      'COLLEGE_ADMIN',
      TEST_CONFIG.testCollegeId,
      'other-college-id'
    );
    logTest('Security - College Isolation', 
      cannotAccessOtherCollege, 
      'Should not access other colleges');
    
    // Test role-based restrictions
    const restrictions = PermissionService.getRoleRestrictions('STUDENT');
    const hasRestrictions = restrictions && restrictions.collegeScope;
    logTest('Security - Role Restrictions', 
      hasRestrictions, 
      'Student role should have restrictions');
    
    // Test action validation with resource ownership
    const cannotAccessOtherUserResource = !PermissionService.canPerformAction(
      'STUDENT',
      TEST_CONFIG.testCollegeId,
      Permission.UPDATE_USER,
      TEST_CONFIG.testCollegeId,
      'other-user-id',
      TEST_CONFIG.testUserId
    );
    logTest('Security - Resource Ownership', 
      cannotAccessOtherUserResource, 
      'Should not access other users\' resources');
    
  } catch (error) {
    logTest('Security Features Tests', false, error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting User Management System Tests...\n');
  
  try {
    await setupTestData();
    
    await testUserService();
    await testPermissionSystem();
    await testAPIEndpoints();
    await testReactComponents();
    await testDataIntegrity();
    await testSecurityFeatures();
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
  } finally {
    await cleanupTestData();
    await prisma.$disconnect();
  }
  
  // Print test summary
  console.log('\n📊 Test Summary:');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`  - ${test.testName}: ${test.details}`);
      });
  }
  
  console.log('\n✅ User Management System Tests Completed!');
  
  return testResults;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testResults };
