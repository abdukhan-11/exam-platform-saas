#!/usr/bin/env node

/**
 * Database Setup Script for Exam Platform
 * Supports development, staging, and production environments
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Environment configuration
const environments = {
  development: {
    name: 'Development',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/exam_platform_dev',
    resetDatabase: true,
    seedData: true,
    verbose: true
  },
  staging: {
    name: 'Staging',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/exam_platform_staging',
    resetDatabase: false,
    seedData: true,
    verbose: true
  },
  production: {
    name: 'Production',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/exam_platform_prod',
    resetDatabase: false,
    seedData: false,
    verbose: false
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step}. ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Database operations
class DatabaseSetup {
  constructor(environment) {
    this.env = environment;
    this.config = environments[environment];
  }

  async checkPrerequisites() {
    logStep(1, 'Checking Prerequisites');
    
    try {
      // Check if Prisma CLI is installed
      execSync('npx prisma --version', { stdio: 'pipe' });
      logSuccess('Prisma CLI is available');
    } catch (error) {
      logError('Prisma CLI not found. Please install it first: npm install -g prisma');
      process.exit(1);
    }

    // Check if .env file exists
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      logWarning('.env file not found. Creating from template...');
      this.createEnvFile();
    } else {
      logSuccess('.env file found');
    }

    // Check database connectivity
    await this.testDatabaseConnection();
  }

  createEnvFile() {
    const envTemplate = `# Database Configuration
DATABASE_URL="${this.config.databaseUrl}"

# Environment
NODE_ENV=${this.env}

# Connection Pooling
DATABASE_MAX_CONNECTIONS=10
DATABASE_MIN_CONNECTIONS=2
DATABASE_CONNECTION_TIMEOUT=30000
DATABASE_IDLE_TIMEOUT=60000
DATABASE_MAX_LIFETIME=300000

# Query Optimization
DATABASE_SLOW_QUERY_THRESHOLD=1000
DATABASE_MAX_QUERY_LOGS=100

# Multi-Tenant Settings
ENABLE_AUTO_COLLEGE_FILTER=false
MULTI_TENANT_STRICT_MODE=false

# Performance Monitoring
ENABLE_DB_METRICS=false
ENABLE_CONNECTION_POOL_METRICS=false
DB_METRICS_INTERVAL=60000

# Security
MAX_QUERY_EXECUTION_TIME=30000

# Backup
ENABLE_AUTO_BACKUP=false
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE="0 2 * * *"
`;

    fs.writeFileSync('.env', envTemplate);
    logSuccess('.env file created from template');
  }

  async testDatabaseConnection() {
    try {
      // Test database connection using Prisma
      execSync('npx prisma db pull --print', { 
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: this.config.databaseUrl }
      });
      logSuccess('Database connection successful');
    } catch (error) {
      logError(`Database connection failed: ${error.message}`);
      logInfo('Please ensure your database is running and accessible');
      process.exit(1);
    }
  }

  async generatePrismaClient() {
    logStep(2, 'Generating Prisma Client');
    
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      logSuccess('Prisma Client generated successfully');
    } catch (error) {
      logError('Failed to generate Prisma Client');
      process.exit(1);
    }
  }

  async runMigrations() {
    logStep(3, 'Running Database Migrations');
    
    try {
      if (this.config.resetDatabase) {
        logInfo('Resetting database (development mode)...');
        execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
      } else {
        logInfo('Applying migrations...');
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      }
      logSuccess('Database migrations completed successfully');
    } catch (error) {
      logError('Database migrations failed');
      process.exit(1);
    }
  }

  async seedDatabase() {
    if (!this.config.seedData) {
      logInfo('Skipping seed data (production mode)');
      return;
    }

    logStep(4, 'Seeding Database with Sample Data');
    
    try {
      execSync('npx prisma db seed', { stdio: 'inherit' });
      logSuccess('Database seeded successfully');
    } catch (error) {
      logWarning('Database seeding failed, but continuing...');
      logInfo('You can run seeding manually later with: npm run prisma:seed');
    }
  }

  async validateSchema() {
    logStep(5, 'Validating Database Schema');
    
    try {
      // Test basic operations
      execSync('npx prisma db pull --print', { stdio: 'pipe' });
      logSuccess('Schema validation passed');
    } catch (error) {
      logError('Schema validation failed');
      process.exit(1);
    }
  }

  async createBackup() {
    if (this.env === 'production') {
      logStep(6, 'Creating Database Backup');
      
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(process.cwd(), 'backups');
        
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
        
        // Create backup using pg_dump (PostgreSQL specific)
        const dbUrl = new URL(this.config.databaseUrl);
        const backupCommand = `pg_dump -h ${dbUrl.hostname} -p ${dbUrl.port} -U ${dbUrl.username} -d ${dbUrl.pathname.slice(1)} > ${backupFile}`;
        
        execSync(backupCommand, { 
          stdio: 'pipe',
          env: { ...process.env, PGPASSWORD: dbUrl.password }
        });
        
        logSuccess(`Database backup created: ${backupFile}`);
      } catch (error) {
        logWarning('Database backup failed, but continuing...');
        logInfo('Please ensure pg_dump is available and database credentials are correct');
      }
    }
  }

  async runHealthChecks() {
    logStep(7, 'Running Health Checks');
    
    try {
      // Test basic database operations
      const testScript = `
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        async function test() {
          try {
            // Test connection
            await prisma.$queryRaw\`SELECT 1\`;
            console.log('✅ Database connection: OK');
            
            // Test basic queries
            const collegeCount = await prisma.college.count();
            console.log(\`✅ College count: \${collegeCount}\`);
            
            const userCount = await prisma.user.count();
            console.log(\`✅ User count: \${userCount}\`);
            
            console.log('✅ All health checks passed');
          } catch (error) {
            console.error('❌ Health check failed:', error.message);
            process.exit(1);
          } finally {
            await prisma.\$disconnect();
          }
        }
        
        test();
      `;
      
      const testFile = path.join(process.cwd(), 'temp-health-check.js');
      fs.writeFileSync(testFile, testScript);
      
      execSync(`node ${testFile}`, { stdio: 'inherit' });
      fs.unlinkSync(testFile);
      
      logSuccess('Health checks completed successfully');
    } catch (error) {
      logError('Health checks failed');
      process.exit(1);
    }
  }

  async setup() {
    log(`\n${colors.bright}🚀 Setting up ${this.config.name} Environment${colors.reset}\n`, 'magenta');
    
    try {
      await this.checkPrerequisites();
      await this.generatePrismaClient();
      await this.runMigrations();
      await this.seedDatabase();
      await this.validateSchema();
      await this.createBackup();
      await this.runHealthChecks();
      
      log(`\n${colors.bright}🎉 ${this.config.name} Environment Setup Completed Successfully!${colors.reset}\n`, 'green');
      
      // Display next steps
      log('📋 Next Steps:', 'cyan');
      log('1. Start your application: npm run dev');
      log('2. Access the database: npx prisma studio');
      log('3. Run tests: npm test');
      log('4. Check logs for any issues');
      
    } catch (error) {
      logError(`Setup failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'development';
  
  if (!environments[environment]) {
    logError(`Invalid environment: ${environment}`);
    logInfo('Available environments: development, staging, production');
    process.exit(1);
  }
  
  const setup = new DatabaseSetup(environment);
  setup.setup();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { DatabaseSetup, environments };
