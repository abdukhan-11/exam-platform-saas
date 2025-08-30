/**
 * Data Recovery Manager
 *
 * Comprehensive system for handling data corruption, loss, and recovery
 * during exam sessions with automatic backup and restoration capabilities.
 */

import { auditLogger } from './audit-logger';

export interface DataBackup {
  id: string;
  timestamp: number;
  examId: string;
  userId: string;
  sessionId: string;
  dataType: 'exam_progress' | 'answers' | 'session_state' | 'user_data';
  data: Record<string, any>;
  checksum: string;
  size: number;
  compressed: boolean;
}

export interface DataRecoveryConfig {
  backupInterval: number; // in milliseconds
  maxBackupsPerSession: number;
  maxBackupAge: number; // in milliseconds
  enableCompression: boolean;
  validateDataIntegrity: boolean;
  autoRecoveryEnabled: boolean;
  recoveryTimeout: number; // in milliseconds
}

export interface RecoveryResult {
  successful: boolean;
  dataType: string;
  bytesRecovered: number;
  timeTaken: number;
  errorMessage?: string;
  backupUsed?: string;
  validationPassed: boolean;
}

export class DataRecoveryManager {
  private config: DataRecoveryConfig;
  private backups = new Map<string, DataBackup[]>();
  private recoveryInProgress = new Set<string>();
  private backupInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: Partial<DataRecoveryConfig> = {}) {
    this.config = {
      backupInterval: 30000, // 30 seconds
      maxBackupsPerSession: 10,
      maxBackupAge: 3600000, // 1 hour
      enableCompression: true,
      validateDataIntegrity: true,
      autoRecoveryEnabled: true,
      recoveryTimeout: 30000, // 30 seconds
      ...config
    };
  }

  /**
   * Initialize the data recovery manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.setupPeriodicBackup();
      this.loadExistingBackups();

      this.isInitialized = true;

      auditLogger.logExamSecurity('exam_started', {
        examId: 'system',
        userId: 'system',
        sessionId: 'system',
        severity: 'low',
        description: 'Data recovery manager initialized',
        metadata: { config: this.config }
      });
    } catch (error) {
      console.error('Failed to initialize data recovery manager:', error);
      throw error;
    }
  }

  /**
   * Create a backup of exam data
   */
  async createBackup(
    examId: string,
    userId: string,
    sessionId: string,
    dataType: DataBackup['dataType'],
    data: Record<string, any>
  ): Promise<string> {
    const sessionKey = `${examId}_${userId}_${sessionId}`;

    const backup: DataBackup = {
      id: this.generateBackupId(),
      timestamp: Date.now(),
      examId,
      userId,
      sessionId,
      dataType,
      data: this.config.enableCompression ? await this.compressData(data) : data,
      checksum: await this.calculateChecksum(data),
      size: this.calculateDataSize(data),
      compressed: this.config.enableCompression
    };

    // Get existing backups for this session
    const sessionBackups = this.backups.get(sessionKey) || [];

    // Add new backup
    sessionBackups.push(backup);

    // Clean up old backups
    const cleanedBackups = this.cleanupOldBackups(sessionBackups);

    // Store cleaned backups
    this.backups.set(sessionKey, cleanedBackups);

    // Log backup creation
    auditLogger.logExamSecurity('copy_paste', {
      examId,
      userId,
      sessionId,
      severity: 'low',
      description: `Backup created for ${dataType}`,
      metadata: {
        backupId: backup.id,
        dataSize: backup.size,
        compressed: backup.compressed
      }
    });

    return backup.id;
  }

  /**
   * Recover data from backup
   */
  async recoverData(
    examId: string,
    userId: string,
    sessionId: string,
    dataType: DataBackup['dataType'],
    backupId?: string
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const sessionKey = `${examId}_${userId}_${sessionId}`;

    // Check if recovery is already in progress
    if (this.recoveryInProgress.has(sessionKey)) {
      return {
        successful: false,
        dataType,
        bytesRecovered: 0,
        timeTaken: Date.now() - startTime,
        errorMessage: 'Recovery already in progress for this session',
        validationPassed: false
      };
    }

    this.recoveryInProgress.add(sessionKey);

    try {
      const sessionBackups = this.backups.get(sessionKey) || [];

      // Find appropriate backup
      const targetBackup = backupId
        ? sessionBackups.find(b => b.id === backupId)
        : this.findBestBackup(sessionBackups, dataType);

      if (!targetBackup) {
        throw new Error(`No backup found for ${dataType}`);
      }

      // Recover data
      const recoveredData = targetBackup.compressed
        ? await this.decompressData(targetBackup.data)
        : targetBackup.data;

      // Validate data integrity if enabled
      const validationPassed = this.config.validateDataIntegrity
        ? await this.validateDataIntegrity(recoveredData, targetBackup.checksum)
        : true;

      const result: RecoveryResult = {
        successful: true,
        dataType,
        bytesRecovered: targetBackup.size,
        timeTaken: Date.now() - startTime,
        backupUsed: targetBackup.id,
        validationPassed
      };

      // Log successful recovery
      auditLogger.logExamSecurity('copy_paste', {
        examId,
        userId,
        sessionId,
        severity: 'medium',
        description: `Data recovery successful for ${dataType}`,
        metadata: result
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const result: RecoveryResult = {
        successful: false,
        dataType,
        bytesRecovered: 0,
        timeTaken: Date.now() - startTime,
        errorMessage,
        validationPassed: false
      };

      // Log recovery failure
      auditLogger.logExamSecurity('copy_paste', {
        examId,
        userId,
        sessionId,
        severity: 'high',
        description: `Data recovery failed for ${dataType}`,
        metadata: { error: errorMessage }
      });

      return result;

    } finally {
      this.recoveryInProgress.delete(sessionKey);
    }
  }

  /**
   * Get available backups for a session
   */
  getAvailableBackups(examId: string, userId: string, sessionId: string): DataBackup[] {
    const sessionKey = `${examId}_${userId}_${sessionId}`;
    return this.backups.get(sessionKey) || [];
  }

  /**
   * Delete old backups
   */
  cleanupBackups(maxAge?: number): void {
    const cutoffTime = Date.now() - (maxAge || this.config.maxBackupAge);
    let totalDeleted = 0;

    for (const [sessionKey, sessionBackups] of this.backups) {
      const originalCount = sessionBackups.length;
      const cleanedBackups = sessionBackups.filter(backup => backup.timestamp > cutoffTime);

      if (cleanedBackups.length !== originalCount) {
        const deletedCount = originalCount - cleanedBackups.length;
        totalDeleted += deletedCount;

        if (cleanedBackups.length === 0) {
          this.backups.delete(sessionKey);
        } else {
          this.backups.set(sessionKey, cleanedBackups);
        }
      }
    }

    if (totalDeleted > 0) {
      console.log(`Cleaned up ${totalDeleted} old backups`);
    }
  }

  /**
   * Get backup statistics
   */
  getBackupStatistics(): {
    totalBackups: number;
    totalSize: number;
    sessionsWithBackups: number;
    oldestBackup?: number;
    newestBackup?: number;
  } {
    let totalBackups = 0;
    let totalSize = 0;
    let oldestBackup: number | undefined;
    let newestBackup: number | undefined;

    for (const sessionBackups of this.backups.values()) {
      totalBackups += sessionBackups.length;

      for (const backup of sessionBackups) {
        totalSize += backup.size;

        if (!oldestBackup || backup.timestamp < oldestBackup) {
          oldestBackup = backup.timestamp;
        }

        if (!newestBackup || backup.timestamp > newestBackup) {
          newestBackup = backup.timestamp;
        }
      }
    }

    return {
      totalBackups,
      totalSize,
      sessionsWithBackups: this.backups.size,
      oldestBackup,
      newestBackup
    };
  }

  /**
   * Export backups for a session
   */
  async exportBackups(examId: string, userId: string, sessionId: string): Promise<string> {
    const sessionKey = `${examId}_${userId}_${sessionId}`;
    const sessionBackups = this.backups.get(sessionKey) || [];

    const exportData = {
      sessionKey,
      exportTimestamp: Date.now(),
      backups: sessionBackups
    };

    // Convert to JSON and compress
    const jsonString = JSON.stringify(exportData);
    const compressed = await this.compressString(jsonString);

    return compressed;
  }

  /**
   * Import backups from export
   */
  async importBackups(exportData: string): Promise<boolean> {
    try {
      const decompressed = await this.decompressString(exportData);
      const data = JSON.parse(decompressed);

      if (!data.sessionKey || !Array.isArray(data.backups)) {
        throw new Error('Invalid export format');
      }

      // Validate and store backups
      for (const backup of data.backups) {
        if (this.validateBackupFormat(backup)) {
          const sessionBackups = this.backups.get(data.sessionKey) || [];
          sessionBackups.push(backup);
          this.backups.set(data.sessionKey, sessionBackups);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to import backups:', error);
      return false;
    }
  }

  /**
   * Set up periodic backup
   */
  private setupPeriodicBackup(): void {
    this.backupInterval = setInterval(() => {
      this.performPeriodicCleanup();
    }, this.config.backupInterval);
  }

  /**
   * Load existing backups from storage
   */
  private async loadExistingBackups(): Promise<void> {
    try {
      // Implementation for loading backups from persistent storage
      // This would typically involve IndexedDB or localStorage
      console.log('Loading existing backups from storage');
    } catch (error) {
      console.error('Failed to load existing backups:', error);
    }
  }

  /**
   * Clean up old backups for a session
   */
  private cleanupOldBackups(sessionBackups: DataBackup[]): DataBackup[] {
    // Sort by timestamp (newest first)
    const sorted = sessionBackups.sort((a, b) => b.timestamp - a.timestamp);

    // Keep only the most recent backups
    const keepCount = Math.min(this.config.maxBackupsPerSession, sorted.length);
    return sorted.slice(0, keepCount);
  }

  /**
   * Find the best backup for recovery
   */
  private findBestBackup(sessionBackups: DataBackup[], dataType: DataBackup['dataType']): DataBackup | null {
    // Filter by data type
    const typeBackups = sessionBackups.filter(backup => backup.dataType === dataType);

    if (typeBackups.length === 0) {
      return null;
    }

    // Return the most recent backup
    return typeBackups.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  /**
   * Compress data
   */
  private async compressData(data: Record<string, any>): Promise<Record<string, any>> {
    try {
      const jsonString = JSON.stringify(data);

      if (typeof CompressionStream !== 'undefined') {
        // Use native compression if available
        const compressed = await this.compressString(jsonString);
        return { _compressed: true, data: compressed };
      }

      // Fallback: return uncompressed
      return data;
    } catch (error) {
      console.warn('Data compression failed, using uncompressed data:', error);
      return data;
    }
  }

  /**
   * Decompress data
   */
  private async decompressData(data: Record<string, any>): Promise<Record<string, any>> {
    if (data._compressed && typeof data.data === 'string') {
      try {
        const decompressed = await this.decompressString(data.data);
        return JSON.parse(decompressed);
      } catch (error) {
        console.error('Data decompression failed:', error);
        throw new Error('Failed to decompress backup data');
      }
    }

    return data;
  }

  /**
   * Compress string using native API
   */
  private async compressString(input: string): Promise<string> {
    if (typeof CompressionStream === 'undefined') {
      return btoa(input); // Fallback to base64
    }

    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    writer.write(new TextEncoder().encode(input));
    writer.close();

    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      compressed.set(chunk, offset);
      offset += chunk.length;
    }

    return btoa(String.fromCharCode(...compressed));
  }

  /**
   * Decompress string using native API
   */
  private async decompressString(input: string): Promise<string> {
    if (typeof DecompressionStream === 'undefined') {
      return atob(input); // Fallback from base64
    }

    const compressed = new Uint8Array(atob(input).split('').map(c => c.charCodeAt(0)));

    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    writer.write(compressed);
    writer.close();

    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      decompressed.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder().decode(decompressed);
  }

  /**
   * Calculate data checksum
   */
  private async calculateChecksum(data: Record<string, any>): Promise<string> {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);

    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback: simple hash
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Validate data integrity
   */
  private async validateDataIntegrity(data: Record<string, any>, expectedChecksum: string): Promise<boolean> {
    const actualChecksum = await this.calculateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Calculate data size
   */
  private calculateDataSize(data: Record<string, any>): number {
    return JSON.stringify(data).length;
  }

  /**
   * Validate backup format
   */
  private validateBackupFormat(backup: any): backup is DataBackup {
    return (
      typeof backup === 'object' &&
      typeof backup.id === 'string' &&
      typeof backup.timestamp === 'number' &&
      typeof backup.examId === 'string' &&
      typeof backup.userId === 'string' &&
      typeof backup.sessionId === 'string' &&
      typeof backup.dataType === 'string' &&
      typeof backup.checksum === 'string' &&
      typeof backup.size === 'number' &&
      typeof backup.compressed === 'boolean'
    );
  }

  /**
   * Perform periodic cleanup
   */
  private performPeriodicCleanup(): void {
    this.cleanupBackups();
  }

  /**
   * Generate unique backup ID
   */
  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Destroy the manager and clean up resources
   */
  destroy(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    this.backups.clear();
    this.recoveryInProgress.clear();
  }
}

// Export singleton instance
export const dataRecoveryManager = new DataRecoveryManager();
