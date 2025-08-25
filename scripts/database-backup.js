#!/usr/bin/env node

/**
 * Database Backup and Restore Script for Exam Platform
 * Supports automated backups, scheduled backups, and restore operations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Configuration
const config = {
  backupDir: path.join(process.cwd(), 'backups'),
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
  schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
  compression: process.env.BACKUP_COMPRESSION === 'true',
  encryption: process.env.BACKUP_ENCRYPTION === 'true',
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || 'default-key'
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

class DatabaseBackup {
  constructor() {
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(config.backupDir)) {
      fs.mkdirSync(config.backupDir, { recursive: true });
      logInfo(`Backup directory created: ${config.backupDir}`);
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(config.backupDir, `backup-${timestamp}.sql`);
    
    try {
      logInfo('Creating database backup...');
      
      // Get database URL from environment
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable not set');
      }
      
      const dbUrl = new URL(databaseUrl);
      
      // Create backup using pg_dump
      const backupCommand = `pg_dump -h ${dbUrl.hostname} -p ${dbUrl.port} -U ${dbUrl.username} -d ${dbUrl.pathname.slice(1)} --verbose --clean --if-exists --no-owner --no-privileges > ${backupFile}`;
      
      execSync(backupCommand, {
        stdio: 'pipe',
        env: { ...process.env, PGPASSWORD: dbUrl.password }
      });
      
      let finalBackupFile = backupFile;
      
      // Compress backup if enabled
      if (config.compression) {
        logInfo('Compressing backup...');
        execSync(`gzip ${backupFile}`);
        finalBackupFile = `${backupFile}.gz`;
        logSuccess('Backup compressed successfully');
      }
      
      // Encrypt backup if enabled
      if (config.encryption) {
        logInfo('Encrypting backup...');
        const encryptedFile = `${finalBackupFile}.enc`;
        execSync(`openssl enc -aes-256-cbc -salt -in ${finalBackupFile} -out ${encryptedFile} -pass pass:${config.encryptionKey}`);
        
        // Remove unencrypted file
        fs.unlinkSync(finalBackupFile);
        finalBackupFile = encryptedFile;
        logSuccess('Backup encrypted successfully');
      }
      
      // Get file size
      const stats = fs.statSync(finalBackupFile);
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      logSuccess(`Database backup created successfully: ${finalBackupFile}`);
      logInfo(`Backup size: ${fileSizeInMB} MB`);
      
      // Clean up old backups
      this.cleanupOldBackups();
      
      return finalBackupFile;
      
    } catch (error) {
      logError(`Backup failed: ${error.message}`);
      throw error;
    }
  }

  async restoreBackup(backupFile) {
    try {
      logInfo(`Restoring database from backup: ${backupFile}`);
      
      // Check if backup file exists
      if (!fs.existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${backupFile}`);
      }
      
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable not set');
      }
      
      const dbUrl = new URL(databaseUrl);
      
      let restoreFile = backupFile;
      
      // Decrypt backup if encrypted
      if (backupFile.endsWith('.enc')) {
        logInfo('Decrypting backup...');
        const decryptedFile = backupFile.replace('.enc', '');
        execSync(`openssl enc -aes-256-cbc -d -in ${backupFile} -out ${decryptedFile} -pass pass:${config.encryptionKey}`);
        restoreFile = decryptedFile;
        logSuccess('Backup decrypted successfully');
      }
      
      // Decompress backup if compressed
      if (restoreFile.endsWith('.gz')) {
        logInfo('Decompressing backup...');
        execSync(`gunzip ${restoreFile}`);
        restoreFile = restoreFile.replace('.gz', '');
        logSuccess('Backup decompressed successfully');
      }
      
      // Restore database
      logInfo('Restoring database...');
      const restoreCommand = `psql -h ${dbUrl.hostname} -p ${dbUrl.port} -U ${dbUrl.username} -d ${dbUrl.pathname.slice(1)} < ${restoreFile}`;
      
      execSync(restoreCommand, {
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: dbUrl.password }
      });
      
      // Clean up temporary files
      if (restoreFile !== backupFile) {
        fs.unlinkSync(restoreFile);
      }
      
      logSuccess('Database restored successfully');
      
    } catch (error) {
      logError(`Restore failed: ${error.message}`);
      throw error;
    }
  }

  cleanupOldBackups() {
    try {
      logInfo('Cleaning up old backups...');
      
      const files = fs.readdirSync(config.backupDir);
      const now = new Date();
      let deletedCount = 0;
      
      files.forEach(file => {
        const filePath = path.join(config.backupDir, file);
        const stats = fs.statSync(filePath);
        const fileAgeInDays = (now - stats.mtime) / (1000 * 60 * 60 * 24);
        
        if (fileAgeInDays > config.retentionDays) {
          fs.unlinkSync(filePath);
          deletedCount++;
          logInfo(`Deleted old backup: ${file}`);
        }
      });
      
      if (deletedCount > 0) {
        logSuccess(`Cleaned up ${deletedCount} old backup(s)`);
      } else {
        logInfo('No old backups to clean up');
      }
      
    } catch (error) {
      logWarning(`Cleanup failed: ${error.message}`);
    }
  }

  listBackups() {
    try {
      const files = fs.readdirSync(config.backupDir);
      
      if (files.length === 0) {
        logInfo('No backup files found');
        return;
      }
      
      logInfo('Available backup files:');
      
      const backups = files
        .map(file => {
          const filePath = path.join(config.backupDir, file);
          const stats = fs.statSync(filePath);
          const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
          
          return {
            name: file,
            size: fileSizeInMB,
            date: stats.mtime,
            path: filePath
          };
        })
        .sort((a, b) => b.date - a.date);
      
      backups.forEach((backup, index) => {
        const dateStr = backup.date.toLocaleString();
        const status = backup.name.includes('.enc') ? '🔒 Encrypted' : 
                      backup.name.includes('.gz') ? '🗜️ Compressed' : '📄 Plain';
        
        log(`${index + 1}. ${backup.name} (${backup.size} MB) - ${dateStr} ${status}`, 'cyan');
      });
      
    } catch (error) {
      logError(`Failed to list backups: ${error.message}`);
    }
  }

  startScheduledBackups() {
    logInfo(`Starting scheduled backups (${config.schedule})`);
    
    cron.schedule(config.schedule, async () => {
      try {
        logInfo('Running scheduled backup...');
        await this.createBackup();
        logSuccess('Scheduled backup completed successfully');
      } catch (error) {
        logError(`Scheduled backup failed: ${error.message}`);
      }
    });
    
    logSuccess('Scheduled backups started');
  }

  async validateBackup(backupFile) {
    try {
      logInfo(`Validating backup: ${backupFile}`);
      
      // Check if backup file exists
      if (!fs.existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${backupFile}`);
      }
      
      // Check file size
      const stats = fs.statSync(backupFile);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }
      
      // Check if it's a valid SQL file (basic validation)
      if (backupFile.endsWith('.sql') || backupFile.endsWith('.sql.gz')) {
        logSuccess('Backup file format is valid');
      }
      
      // Check if it's encrypted
      if (backupFile.endsWith('.enc')) {
        logSuccess('Backup file is encrypted');
      }
      
      logSuccess('Backup validation passed');
      return true;
      
    } catch (error) {
      logError(`Backup validation failed: ${error.message}`);
      return false;
    }
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const backup = new DatabaseBackup();
  
  switch (command) {
    case 'create':
      backup.createBackup()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'restore':
      const backupFile = args[1];
      if (!backupFile) {
        logError('Please specify a backup file to restore');
        logInfo('Usage: node database-backup.js restore <backup-file>');
        process.exit(1);
      }
      
      backup.restoreBackup(backupFile)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'list':
      backup.listBackups();
      break;
      
    case 'validate':
      const fileToValidate = args[1];
      if (!fileToValidate) {
        logError('Please specify a backup file to validate');
        logInfo('Usage: node database-backup.js validate <backup-file>');
        process.exit(1);
      }
      
      backup.validateBackup(fileToValidate)
        .then(isValid => process.exit(isValid ? 0 : 1))
        .catch(() => process.exit(1));
      break;
      
    case 'schedule':
      backup.startScheduledBackups();
      // Keep the process running
      logInfo('Press Ctrl+C to stop scheduled backups');
      break;
      
    case 'cleanup':
      backup.cleanupOldBackups();
      break;
      
    default:
      log('Database Backup and Restore Tool', 'bright');
      log('\nAvailable commands:', 'cyan');
      log('  create    - Create a new backup');
      log('  restore   - Restore from backup');
      log('  list      - List available backups');
      log('  validate  - Validate backup file');
      log('  schedule  - Start scheduled backups');
      log('  cleanup   - Clean up old backups');
      log('\nExamples:', 'yellow');
      log('  node database-backup.js create');
      log('  node database-backup.js restore backups/backup-2025-01-01.sql');
      log('  node database-backup.js list');
      log('  node database-backup.js validate backups/backup-2025-01-01.sql');
      log('  node database-backup.js schedule');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { DatabaseBackup, config };
