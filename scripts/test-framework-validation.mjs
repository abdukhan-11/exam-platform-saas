#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

const projectRoot = process.cwd()

console.log('🧪 Testing Framework Validation...\n')

// Test configuration
const testSuites = [
  {
    name: 'Basic Jest Setup',
    command: 'npm test tests/unit/simple.test.tsx',
    description: 'Testing basic Jest configuration and React Testing Library',
    critical: true
  },
  {
    name: 'Jest Configuration',
    command: 'npm test -- --version',
    description: 'Verifying Jest is properly installed and configured',
    critical: true
  },
  {
    name: 'Playwright Installation',
    command: 'npx playwright --version',
    description: 'Verifying Playwright is installed',
    critical: false
  },
  {
    name: 'Stryker Installation',
    command: 'npx stryker --version',
    description: 'Verifying Stryker is installed',
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
      timeout: 60000 // 1 minute timeout
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
  console.log('📊 TESTING FRAMEWORK VALIDATION REPORT')
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
    console.log(`\n🎉 All test suites passed! Testing framework is ready.`)
  }
}

// Main execution
async function validateTestingFramework() {
  console.log('🚀 Exam Platform - Testing Framework Validation')
  console.log('Validating Comprehensive Testing Setup\n')
  
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
  console.log('\n\n🛑 Test validation interrupted by user')
  process.exit(1)
})

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Test validation terminated')
  process.exit(1)
})

// Run the validation
validateTestingFramework().catch(error => {
  console.error('\n💥 Unexpected error during validation:', error)
  process.exit(1)
})
