#!/usr/bin/env node

/**
 * Test script for Exam Publishing and Activation APIs
 * Tests the complete lifecycle of exam publishing and activation
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test data
const testExam = {
  title: 'Test Exam for Publishing',
  description: 'This is a test exam to validate the publishing and activation APIs',
  duration: 60,
  totalMarks: 100,
  passingMarks: 40,
  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
  subjectId: 'test-subject-id', // This will need to be a real subject ID
  enableQuestionShuffling: true,
  enableBrowserLock: true,
  enableFullscreenMode: true
};

const testQuestion = {
  text: 'What is 2 + 2?',
  type: 'MULTIPLE_CHOICE',
  marks: 10,
  difficulty: 'EASY',
  correctAnswer: '4',
  options: [
    { text: '3', isCorrect: false },
    { text: '4', isCorrect: true },
    { text: '5', isCorrect: false },
    { text: '6', isCorrect: false }
  ]
};

async function makeRequest(url: string, options: any = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error(`Request failed: ${error}`);
    return { status: 0, data: { error: error.message } };
  }
}

async function testExamCreation() {
  console.log('🧪 Testing Exam Creation...');
  
  const response = await makeRequest(`${BASE_URL}/api/exams`, {
    method: 'POST',
    body: JSON.stringify(testExam)
  });
  
  if (response.status === 201) {
    console.log('✅ Exam created successfully');
    return response.data.id;
  } else {
    console.log('❌ Exam creation failed:', response.data);
    return null;
  }
}

async function testQuestionCreation(examId: string) {
  console.log('🧪 Testing Question Creation...');
  
  const response = await makeRequest(`${BASE_URL}/api/questions`, {
    method: 'POST',
    body: JSON.stringify({
      ...testQuestion,
      examId
    })
  });
  
  if (response.status === 201) {
    console.log('✅ Question created successfully');
    return response.data.id;
  } else {
    console.log('❌ Question creation failed:', response.data);
    return null;
  }
}

async function testExamPublishing(examId: string) {
  console.log('🧪 Testing Exam Publishing...');
  
  // Test publishing
  const publishResponse = await makeRequest(`${BASE_URL}/api/exams/${examId}/publish`, {
    method: 'POST'
  });
  
  if (publishResponse.status === 200) {
    console.log('✅ Exam published successfully');
    console.log('📊 Response:', publishResponse.data);
  } else {
    console.log('❌ Exam publishing failed:', publishResponse.data);
    return false;
  }
  
  // Test status after publishing
  const statusResponse = await makeRequest(`${BASE_URL}/api/exams/${examId}/status`);
  
  if (statusResponse.status === 200) {
    console.log('✅ Exam status retrieved successfully');
    console.log('📊 Status:', statusResponse.data.status);
    console.log('📊 Details:', statusResponse.data.statusDetails);
  } else {
    console.log('❌ Exam status retrieval failed:', statusResponse.data);
  }
  
  return true;
}

async function testExamActivation(examId: string) {
  console.log('🧪 Testing Exam Activation...');
  
  // Test activation
  const activateResponse = await makeRequest(`${BASE_URL}/api/exams/${examId}/activate`, {
    method: 'POST'
  });
  
  if (activateResponse.status === 200) {
    console.log('✅ Exam activated successfully');
    console.log('📊 Response:', activateResponse.data);
  } else {
    console.log('❌ Exam activation failed:', activateResponse.data);
    return false;
  }
  
  // Test status after activation
  const statusResponse = await makeRequest(`${BASE_URL}/api/exams/${examId}/status`);
  
  if (statusResponse.status === 200) {
    console.log('✅ Exam status retrieved successfully');
    console.log('📊 Status:', statusResponse.data.status);
    console.log('📊 Statistics:', statusResponse.data.statistics);
  } else {
    console.log('❌ Exam status retrieval failed:', statusResponse.data);
  }
  
  return true;
}

async function testExamDeactivation(examId: string) {
  console.log('🧪 Testing Exam Deactivation...');
  
  const deactivateResponse = await makeRequest(`${BASE_URL}/api/exams/${examId}/activate`, {
    method: 'DELETE'
  });
  
  if (deactivateResponse.status === 200) {
    console.log('✅ Exam deactivated successfully');
    console.log('📊 Response:', deactivateResponse.data);
  } else {
    console.log('❌ Exam deactivation failed:', deactivateResponse.data);
    return false;
  }
  
  return true;
}

async function testExamUnpublishing(examId: string) {
  console.log('🧪 Testing Exam Unpublishing...');
  
  const unpublishResponse = await makeRequest(`${BASE_URL}/api/exams/${examId}/publish`, {
    method: 'DELETE'
  });
  
  if (unpublishResponse.status === 200) {
    console.log('✅ Exam unpublished successfully');
    console.log('📊 Response:', unpublishResponse.data);
  } else {
    console.log('❌ Exam unpublishing failed:', unpublishResponse.data);
    return false;
  }
  
  return true;
}

async function testErrorCases(examId: string) {
  console.log('🧪 Testing Error Cases...');
  
  // Test publishing already published exam
  const duplicatePublishResponse = await makeRequest(`${BASE_URL}/api/exams/${examId}/publish`, {
    method: 'POST'
  });
  
  if (duplicatePublishResponse.status === 409) {
    console.log('✅ Correctly prevented duplicate publishing');
  } else {
    console.log('❌ Should have prevented duplicate publishing');
  }
  
  // Test activating unpublished exam
  const activateUnpublishedResponse = await makeRequest(`${BASE_URL}/api/exams/${examId}/activate`, {
    method: 'POST'
  });
  
  if (activateUnpublishedResponse.status === 400) {
    console.log('✅ Correctly prevented activating unpublished exam');
  } else {
    console.log('❌ Should have prevented activating unpublished exam');
  }
  
  // Test invalid exam ID
  const invalidResponse = await makeRequest(`${BASE_URL}/api/exams/invalid-id/publish`, {
    method: 'POST'
  });
  
  if (invalidResponse.status === 404) {
    console.log('✅ Correctly handled invalid exam ID');
  } else {
    console.log('❌ Should have handled invalid exam ID');
  }
}

async function runTests() {
  console.log('🚀 Starting Exam Publishing and Activation API Tests\n');
  
  // Create exam
  const examId = await testExamCreation();
  if (!examId) {
    console.log('❌ Cannot proceed without exam creation');
    return;
  }
  
  // Create question
  const questionId = await testQuestionCreation(examId);
  if (!questionId) {
    console.log('❌ Cannot proceed without question creation');
    return;
  }
  
  console.log('\n📋 Test Results Summary:');
  console.log('========================');
  
  // Test publishing
  const publishSuccess = await testExamPublishing(examId);
  
  // Test activation
  const activateSuccess = await testExamActivation(examId);
  
  // Test deactivation
  const deactivateSuccess = await testExamDeactivation(examId);
  
  // Test unpublishing
  const unpublishSuccess = await testExamUnpublishing(examId);
  
  // Test error cases
  await testErrorCases(examId);
  
  console.log('\n📊 Final Test Summary:');
  console.log('=====================');
  console.log(`✅ Exam Creation: ${examId ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Question Creation: ${questionId ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Exam Publishing: ${publishSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Exam Activation: ${activateSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Exam Deactivation: ${deactivateSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Exam Unpublishing: ${unpublishSuccess ? 'PASS' : 'FAIL'}`);
  
  const allPassed = examId && questionId && publishSuccess && activateSuccess && deactivateSuccess && unpublishSuccess;
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Exam Publishing and Activation APIs are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };
