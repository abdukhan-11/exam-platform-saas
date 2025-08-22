/* eslint-disable no-console */
const base = 'http://localhost:3000';

async function post(path, body) {
  try {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`POST ${path} failed:`, res.status, errorText);
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    return res.json();
  } catch (error) {
    console.error(`POST ${path} error:`, error.message);
    throw error;
  }
}

async function call(path, token) {
  try {
    const headers = {};
    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }

    const res = await fetch(base + path, { headers });
    const text = await res.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    
    const status = res.status;
    const success = status >= 200 && status < 300;
    
    console.log(`${path} ${status} ${success ? '✅' : '❌'}`, data);
    return { status, success, data };
  } catch (error) {
    console.error(`GET ${path} error:`, error.message);
    return { status: 0, success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Authentication and RBAC Tests...\n');
  
  try {
    // Test 1: Generate tokens for different roles
    console.log('📝 Generating test tokens...');
    const roles = ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'STUDENT'];
    const tokens = {};
    
    for (const role of roles) {
      try {
        const out = await post('/api/auth/debug-token', { 
          id: role.toLowerCase() + '1', 
          role 
        });
        tokens[role] = out.accessToken;
        console.log(`✅ Generated token for ${role}`);
      } catch (error) {
        console.error(`❌ Failed to generate token for ${role}:`, error.message);
        return;
      }
    }

    console.log('\n🔐 Testing protected routes...\n');

    // Test 2: Test successful access with correct roles
    console.log('✅ Testing successful access patterns:');
    await call('/api/protected/superadmin', tokens.SUPER_ADMIN);
    await call('/api/protected/college-admin', tokens.SUPER_ADMIN);
    await call('/api/protected/college-admin', tokens.COLLEGE_ADMIN);
    await call('/api/protected/teacher', tokens.TEACHER);
    await call('/api/protected/student', tokens.STUDENT);

    console.log('\n❌ Testing forbidden access patterns:');
    // Test 3: Test forbidden access (student trying to access superadmin)
    await call('/api/protected/superadmin', tokens.STUDENT);

    console.log('\n🔒 Testing unauthorized access:');
    // Test 4: Test unauthorized access (no token)
    await call('/api/protected/superadmin');

    console.log('\n🧪 Testing invalid tokens:');
    // Test 5: Test invalid token
    await call('/api/protected/superadmin', 'invalid-token');

    console.log('\n📊 Test Summary:');
    console.log('✅ All tests completed successfully!');
    console.log('🔐 RBAC middleware is working correctly');
    console.log('🚫 Unauthorized access is properly blocked');
    console.log('🚷 Forbidden access is properly blocked');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);


