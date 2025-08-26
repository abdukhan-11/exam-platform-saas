#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

const projectRoot = process.cwd()

console.log('🧪 Starting Comprehensive Testing Framework...\n')

// Test configuration
const testSuites = [
  {
    name: 'Unit Tests',
    command: 'npm run test:unit',
    description: 'Running unit tests for authentication components',
    critical: true
  },
  {
    name: 'Integration Tests',
    command: 'npm run test:integration',
    description: 'Running integration tests for authentication flows',
    critical: true
  },
  {
    name: 'Security Tests',
    command: 'npm run test:security',
    description: 'Running security tests for authentication vulnerabilities',
    critical: true
  },
  {
    name: 'Performance Tests',
    command: 'npm run test:performance',
    description: 'Running performance tests for authentication system',
    critical: false
  },
  {
    name: 'End-to-End Tests',
    command: 'npm run test:e2e',
    description: 'Running end-to-end tests with Playwright',
    critical: true
  },
  {
    name: 'Mutation Tests',
    command: 'npm run test:mutations',
    description: 'Running mutation tests with Stryker',
    critical: false
  }
]

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: testSuites.length
}

// Utility functions
function runCommand(command, description) {
  console.log(`\n📋 ${description}`)
  console.log(`🔧 Running: ${command}`)
  console.log('─'.repeat(60))
  
  try {
    const startTime = Date.now()
    execSync(command, { 
      stdio: 'inherit', 
      cwd: projectRoot,
      timeout: 300000 // 5 minutes timeout
    })
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    
    console.log(`✅ ${description} - PASSED (${duration}s)`)
    return { success: true, duration }
  } catch (error) {
    console.log(`❌ ${description} - FAILED`)
    console.error(`Error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

function checkDependencies() {
  console.log('🔍 Checking test dependencies...')
  
  const requiredFiles = [
    'jest.config.js',
    'jest.setup.js',
    'playwright.config.ts',
    'stryker.conf.json'
  ]
  
  const missingFiles = requiredFiles.filter(file => !existsSync(join(projectRoot, file)))
  
  if (missingFiles.length > 0) {
    console.log('⚠️  Missing configuration files:')
    missingFiles.forEach(file => console.log(`   - ${file}`))
    return false
  }
  
  console.log('✅ All configuration files present')
  return true
}

function generateReport() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 COMPREHENSIVE TEST REPORT')
  console.log('='.repeat(60))
  
  console.log(`\n📈 Summary:`)
  console.log(`   Total Test Suites: ${results.total}`)
  console.log(`   ✅ Passed: ${results.passed}`)
  console.log(`   ❌ Failed: ${results.failed}`)
  console.log(`   ⏭️  Skipped: ${results.skipped}`)
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1)
  console.log(`   📊 Success Rate: ${successRate}%`)
  
  if (results.failed > 0) {
    console.log(`\n⚠️  ${results.failed} test suite(s) failed. Please review the errors above.`)
    process.exit(1)
  } else {
    console.log(`\n🎉 All test suites passed! Authentication system is ready for production.`)
  }
}

// Main execution
async function runComprehensiveTests() {
  console.log('🚀 Exam Platform - Comprehensive Testing Framework')
  console.log('Testing Authentication System Components\n')
  
  // Check dependencies
  if (!checkDependencies()) {
    console.log('\n❌ Missing dependencies. Please ensure all configuration files are present.')
    process.exit(1)
  }
  
  // Run test suites
  for (const suite of testSuites) {
    const result = runCommand(suite.command, suite.description)
    
    if (result.success) {
      results.passed++
    } else {
      results.failed++
      
      if (suite.critical) {
        console.log(`\n🛑 Critical test suite failed: ${suite.name}`)
        console.log('Stopping execution due to critical failure.')
        break
      } else {
        console.log(`\n⚠️  Non-critical test suite failed: ${suite.name}`)
        console.log('Continuing with remaining tests...')
      }
    }
  }
  
  // Generate final report
  generateReport()
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test execution interrupted by user')
  process.exit(1)
})

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Test execution terminated')
  process.exit(1)
})

// Run the tests
runComprehensiveTests().catch(error => {
  console.error('\n💥 Unexpected error during test execution:', error)
  process.exit(1)
})
