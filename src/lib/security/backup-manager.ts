/**
 * Backup Manager
 *
 * Comprehensive backup system for exam data, session state, and user progress
 * with automatic scheduling, integrity verification, and disaster recovery.
 */

import { auditLogger } from './audit-logger';

export interface BackupConfig {
  backupInterval: number; // in milliseconds
  maxBackupsPerSession: number;
  maxBackupAge: number; // in milliseconds
  enableCompression: boolean;
  enableEncryption: boolean;
  verifyIntegrity: boolean;
  backupOnCriticalEvents: boolean;
  autoCleanupEnabled: boolean;
  remoteBackupEnabled: boolean;
  backupRetentionPolicy: {
    keepDaily: number; // days
    keepWeekly: number; // weeks
    keepMonthly: number; // months
  };
}

export interface BackupData {
  id: string;
  sessionId: string;
  examId: string;
  userId: string;
  timestamp: number;
  type: 'full' | 'incremental' | 'critical' | 'auto';
  data: Record<string, any>;
  metadata: {
    size: number;
    compressed: boolean;
    encrypted: boolean;
    checksum: string;
    version: string;
    clientInfo: {
      userAgent: string;
      platform: string;
      timestamp: number;
    };
  };
  status: 'pending' | 'completed' | 'failed' | 'corrupted';
  storage: {
    local: boolean;
    remote: boolean;
    remoteUrl?: string;
  };
}

export interface BackupResult {
  successful: boolean;
  backupId?: string;
  size: number;
  timeTaken: number;
  errorMessage?: string;
  integrityVerified: boolean;
  storageLocations: string[];
}

export interface BackupStatistics {
  totalBackups: number;
  totalSize: number;
  successRate: number;
  averageBackupTime: number;
  oldestBackup?: number;
  newestBackup?: number;
  storageBreakdown: {
    local: number;
    remote: number;
  };
}

export class BackupManager {
  private config: BackupConfig;
  private backups = new Map<string, BackupData[]>();
  private backupInterval?: NodeJS.Timeout;
  private pendingBackups = new Map<string, BackupData>();
  private isInitialized = false;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      backupInterval: 300000, // 5 minutes
      maxBackupsPerSession: 20,
      maxBackupAge: 86400000, // 24 hours
      enableCompression: true,
      enableEncryption: false,
      verifyIntegrity: true,
      backupOnCriticalEvents: true,
      autoCleanupEnabled: true,
      remoteBackupEnabled: false,
      backupRetentionPolicy: {
        keepDaily: 7, // 7 days
        keepWeekly: 4, // 4 weeks
        keepMonthly: 12 // 12 months
      },
      ...config
    };
  }

  /**
   * Initialize the backup manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.setupPeriodicBackup();
      await this.loadExistingBackups();
      this.startCleanupScheduler();

      this.isInitialized = true;

      auditLogger.logExamSecurity('exam_started', {
        examId: 'system',
        userId: 'system',
        sessionId: 'system',
        severity: 'low',
        description: 'Backup manager initialized',
        metadata: { config: this.config }
      });
    } catch (error) {
      console.error('Failed to initialize backup manager:', error);
      throw error;
    }
  }

  /**
   * Create a backup of exam data
   */
  async createBackup(
    sessionId: string,
    examId: string,
    userId: string,
    data: Record<string, any>,
    type: BackupData['type'] = 'auto',
    options: {
      force?: boolean;
      priority?: 'low' | 'medium' | 'high';
      includeMetadata?: boolean;
    } = {}
  ): Promise<BackupResult> {
    const startTime = Date.now();
    const sessionKey = this.getSessionKey(sessionId);

    try {
      // Check if backup is needed
      if (!options.force && !this.shouldCreateBackup(sessionKey, data)) {
        return {
          successful: false,
          size: 0,
          timeTaken: Date.now() - startTime,
          errorMessage: 'Backup not needed - no significant changes',
          integrityVerified: false,
          storageLocations: []
        };
      }

      // Prepare backup data
      const backupData: BackupData = {
        id: this.generateBackupId(),
        sessionId,
        examId,
        userId,
        timestamp: Date.now(),
        type,
        data: this.config.enableCompression ? await this.compressData(data) : data,
        metadata: {
          size: this.calculateDataSize(data),
          compressed: this.config.enableCompression,
          encrypted: this.config.enableEncryption,
          checksum: await this.calculateChecksum(data),
          version: '1.0',
          clientInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timestamp: Date.now()
          }
        },
        status: 'pending',
        storage: {
          local: true,
          remote: this.config.remoteBackupEnabled
        }
      };

      // Store locally first
      await this.storeLocalBackup(backupData);

      // Store remotely if enabled
      if (this.config.remoteBackupEnabled) {
        await this.storeRemoteBackup(backupData);
      }

      // Verify integrity if enabled
      const integrityVerified = this.config.verifyIntegrity
        ? await this.verifyBackupIntegrity(backupData)
        : true;

      // Update backup status
      backupData.status = integrityVerified ? 'completed' : 'corrupted';

      // Add to backup history
      const sessionBackups = this.backups.get(sessionKey) || [];
      sessionBackups.push(backupData);
      this.backups.set(sessionKey, sessionBackups);

      // Clean up old backups
      await this.cleanupOldBackups(sessionKey);

      const result: BackupResult = {
        successful: true,
        backupId: backupData.id,
        size: backupData.metadata.size,
        timeTaken: Date.now() - startTime,
        integrityVerified,
        storageLocations: this.getStorageLocations(backupData)
      };

      // Log successful backup
      auditLogger.logExamSecurity('copy_paste', {
        examId,
        userId,
        sessionId,
        severity: 'low',
        description: 'Backup created successfully',
        metadata: {
          backupId: backupData.id,
          type,
          size: backupData.metadata.size,
          compressed: backupData.metadata.compressed,
          timeTaken: result.timeTaken
        }
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const result: BackupResult = {
        successful: false,
        size: 0,
        timeTaken: Date.now() - startTime,
        errorMessage,
        integrityVerified: false,
        storageLocations: []
      };

      // Log backup failure
      auditLogger.logExamSecurity('copy_paste', {
        examId,
        userId,
        sessionId,
        severity: 'high',
        description: 'Backup creation failed',
        metadata: {
          type,
          error: errorMessage,
          timeTaken: result.timeTaken
        }
      });

      return result;
    }
  }

  /**
   * Restore data from backup
   */
  async restoreFromBackup(
    sessionId: string,
    backupId?: string,
    options: {
      verifyIntegrity?: boolean;
      preferRemote?: boolean;
    } = {}
  ): Promise<Record<string, any> | null> {
    const sessionKey = this.getSessionKey(sessionId);
    const sessionBackups = this.backups.get(sessionKey) || [];

    if (sessionBackups.length === 0) {
      console.warn(`No backups found for session: ${sessionId}`);
      return null;
    }

    // Find the target backup
    let targetBackup: BackupData | null = null;

    if (backupId) {
      targetBackup = sessionBackups.find(b => b.id === backupId) || null;
    } else {
      // Get the most recent successful backup
      const successfulBackups = sessionBackups
        .filter(b => b.status === 'completed')
        .sort((a, b) => b.timestamp - a.timestamp);

      targetBackup = successfulBackups[0] || null;
    }

    if (!targetBackup) {
      console.warn(`Target backup not found for session: ${sessionId}`);
      return null;
    }

    try {
      // Verify integrity if requested
      if (options.verifyIntegrity && this.config.verifyIntegrity) {
        const isValid = await this.verifyBackupIntegrity(targetBackup);
        if (!isValid) {
          console.error(`Backup integrity check failed for: ${targetBackup.id}`);
          return null;
        }
      }

      // Retrieve backup data
      let backupData: Record<string, any>;

      if (options.preferRemote && targetBackup.storage.remote && targetBackup.storage.remoteUrl) {
        backupData = await this.retrieveRemoteBackup(targetBackup);
      } else {
        backupData = await this.retrieveLocalBackup(targetBackup);
      }

      // Decompress if needed
      if (targetBackup.metadata.compressed) {
        backupData = await this.decompressData(backupData);
      }

      // Log successful restoration
      auditLogger.logExamSecurity('copy_paste', {
        examId: targetBackup.examId,
        userId: targetBackup.userId,
        sessionId,
        severity: 'low',
        description: 'Backup restored successfully',
        metadata: {
          backupId: targetBackup.id,
          type: targetBackup.type,
          size: targetBackup.metadata.size
        }
      });

      return backupData;

    } catch (error) {
      console.error(`Failed to restore backup ${targetBackup.id}:`, error);

      // Log restoration failure
      auditLogger.logExamSecurity('copy_paste', {
        examId: targetBackup.examId,
        userId: targetBackup.userId,
        sessionId,
        severity: 'high',
        description: 'Backup restoration failed',
        metadata: {
          backupId: targetBackup.id,
          error: error instanceof Error ? error.message : String(error)
        }
      });

      return null;
    }
  }

  /**
   * Get backup history for a session
   */
  getBackupHistory(
    sessionId: string,
    options: {
      type?: BackupData['type'];
      status?: BackupData['status'];
      limit?: number;
    } = {}
  ): BackupData[] {
    const sessionKey = this.getSessionKey(sessionId);
    let sessionBackups = this.backups.get(sessionKey) || [];

    // Apply filters
    if (options.type) {
      sessionBackups = sessionBackups.filter(b => b.type === options.type);
    }

    if (options.status) {
      sessionBackups = sessionBackups.filter(b => b.status === options.status);
    }

    // Sort by timestamp (newest first)
    sessionBackups.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (options.limit) {
      sessionBackups = sessionBackups.slice(0, options.limit);
    }

    return sessionBackups;
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(sessionId: string, backupId: string): Promise<boolean> {
    const sessionKey = this.getSessionKey(sessionId);
    const sessionBackups = this.backups.get(sessionKey) || [];

    const backupIndex = sessionBackups.findIndex(b => b.id === backupId);
    if (backupIndex === -1) {
      return false;
    }

    const backup = sessionBackups[backupIndex];

    try {
      // Delete from local storage
      await this.deleteLocalBackup(backup);

      // Delete from remote storage if applicable
      if (backup.storage.remote) {
        await this.deleteRemoteBackup(backup);
      }

      // Remove from history
      sessionBackups.splice(backupIndex, 1);
      this.backups.set(sessionKey, sessionBackups);

      // Log deletion
      auditLogger.logExamSecurity('copy_paste', {
        examId: backup.examId,
        userId: backup.userId,
        sessionId,
        severity: 'low',
        description: 'Backup deleted successfully',
        metadata: { backupId }
      });

      return true;

    } catch (error) {
      console.error(`Failed to delete backup ${backupId}:`, error);
      return false;
    }
  }

  /**
   * Get backup statistics
   */
  getBackupStatistics(): BackupStatistics {
    let totalBackups = 0;
    let totalSize = 0;
    let successfulBackups = 0;
    let totalBackupTime = 0;
    let oldestBackup: number | undefined;
    let newestBackup: number | undefined;
    let localStorageCount = 0;
    let remoteStorageCount = 0;

    for (const sessionBackups of this.backups.values()) {
      for (const backup of sessionBackups) {
        totalBackups++;
        totalSize += backup.metadata.size;

        if (backup.status === 'completed') {
          successfulBackups++;
        }

        if (!oldestBackup || backup.timestamp < oldestBackup) {
          oldestBackup = backup.timestamp;
        }

        if (!newestBackup || backup.timestamp > newestBackup) {
          newestBackup = backup.timestamp;
        }

        if (backup.storage.local) localStorageCount++;
        if (backup.storage.remote) remoteStorageCount++;
      }
    }

    return {
      totalBackups,
      totalSize,
      successRate: totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 0,
      averageBackupTime: 0, // Would need to track individual backup times
      oldestBackup,
      newestBackup,
      storageBreakdown: {
        local: localStorageCount,
        remote: remoteStorageCount
      }
    };
  }

  /**
   * Force immediate backup of all active sessions
   */
  async forceBackupAll(): Promise<void> {
    // Implementation would iterate through all active sessions
    // and create backups for each
    console.log('Force backup all sessions');
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupBackups(): Promise<void> {
    const now = Date.now();
    let totalDeleted = 0;

    for (const [sessionKey, sessionBackups] of this.backups) {
      const originalCount = sessionBackups.length;

      // Apply retention policy
      const cleanedBackups = this.applyRetentionPolicy(sessionBackups, now);

      // Remove backups older than max age
      const finalBackups = cleanedBackups.filter(backup =>
        (now - backup.timestamp) <= this.config.maxBackupAge
      );

      const deletedCount = originalCount - finalBackups.length;
      totalDeleted += deletedCount;

      if (finalBackups.length === 0) {
        this.backups.delete(sessionKey);
      } else {
        this.backups.set(sessionKey, finalBackups);
      }
    }

    if (totalDeleted > 0) {
      console.log(`Cleaned up ${totalDeleted} old backups`);
    }
  }

  /**
   * Set up periodic backup
   */
  private setupPeriodicBackup(): void {
    this.backupInterval = setInterval(async () => {
      await this.performPeriodicBackup();
    }, this.config.backupInterval);
  }

  /**
   * Perform periodic backup of all active sessions
   */
  private async performPeriodicBackup(): Promise<void> {
    // Implementation would backup all active exam sessions
    console.log('Performing periodic backup');
  }

  /**
   * Start cleanup scheduler
   */
  private startCleanupScheduler(): void {
    // Run cleanup every hour
    setInterval(async () => {
      await this.cleanupBackups();
    }, 3600000); // 1 hour
  }

  /**
   * Should create backup based on data changes
   */
  private shouldCreateBackup(sessionKey: string, newData: Record<string, any>): boolean {
    // Simple implementation - always create backup for now
    // In a real implementation, you might compare checksums or track changes
    return true;
  }

  /**
   * Apply retention policy to backups
   */
  private applyRetentionPolicy(backups: BackupData[], now: number): BackupData[] {
    const policy = this.config.backupRetentionPolicy;
    const keptBackups: BackupData[] = [];

    // Group backups by time periods
    const dailyBackups: BackupData[] = [];
    const weeklyBackups: BackupData[] = [];
    const monthlyBackups: BackupData[] = [];
    const recentBackups: BackupData[] = [];

    for (const backup of backups) {
      const ageDays = (now - backup.timestamp) / (1000 * 60 * 60 * 24);

      if (ageDays <= policy.keepDaily) {
        dailyBackups.push(backup);
      } else if (ageDays <= policy.keepWeekly * 7) {
        weeklyBackups.push(backup);
      } else if (ageDays <= policy.keepMonthly * 30) {
        monthlyBackups.push(backup);
      } else {
        recentBackups.push(backup);
      }
    }

    // Keep the most recent backup from each period
    const keepIds = new Set<string>();

    // Keep all daily backups
    dailyBackups.forEach(b => keepIds.add(b.id));

    // Keep one backup per week for weekly period
    this.keepPeriodicBackups(weeklyBackups, 7, keepIds);

    // Keep one backup per month for monthly period
    this.keepPeriodicBackups(monthlyBackups, 30, keepIds);

    // Keep all recent backups (within retention period)
    recentBackups.forEach(b => keepIds.add(b.id));

    return backups.filter(b => keepIds.has(b.id));
  }

  /**
   * Keep periodic backups (helper method)
   */
  private keepPeriodicBackups(backups: BackupData[], periodDays: number, keepIds: Set<string>): void {
    const sorted = backups.sort((a, b) => a.timestamp - b.timestamp);
    let currentPeriod = 0;

    for (const backup of sorted) {
      const period = Math.floor(backup.timestamp / (periodDays * 24 * 60 * 60 * 1000));

      if (period > currentPeriod) {
        keepIds.add(backup.id);
        currentPeriod = period;
      }
    }
  }

  // Storage methods (simplified implementations)
  private async storeLocalBackup(backup: BackupData): Promise<void> {
    // Implementation for local storage
    const key = `exam_backup_${backup.id}`;
    localStorage.setItem(key, JSON.stringify(backup));
  }

  private async storeRemoteBackup(backup: BackupData): Promise<void> {
    // Implementation for remote storage
    console.log('Storing backup remotely:', backup.id);
  }

  private async retrieveLocalBackup(backup: BackupData): Promise<Record<string, any>> {
    const key = `exam_backup_${backup.id}`;
    const data = localStorage.getItem(key);
    if (!data) throw new Error('Backup not found in local storage');
    return JSON.parse(data).data;
  }

  private async retrieveRemoteBackup(backup: BackupData): Promise<Record<string, any>> {
    // Implementation for remote retrieval
    throw new Error('Remote backup retrieval not implemented');
  }

  private async deleteLocalBackup(backup: BackupData): Promise<void> {
    const key = `exam_backup_${backup.id}`;
    localStorage.removeItem(key);
  }

  private async deleteRemoteBackup(backup: BackupData): Promise<void> {
    // Implementation for remote deletion
    console.log('Deleting remote backup:', backup.id);
  }

  private async verifyBackupIntegrity(backup: BackupData): Promise<boolean> {
    try {
      const data = await this.retrieveLocalBackup(backup);
      const checksum = await this.calculateChecksum(data);
      return checksum === backup.metadata.checksum;
    } catch (error) {
      return false;
    }
  }

  private getStorageLocations(backup: BackupData): string[] {
    const locations: string[] = [];
    if (backup.storage.local) locations.push('local');
    if (backup.storage.remote) locations.push('remote');
    return locations;
  }

  private async loadExistingBackups(): Promise<void> {
    // Load backups from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('exam_backup_')) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const backup: BackupData = JSON.parse(data);
            const sessionKey = this.getSessionKey(backup.sessionId);
            const sessionBackups = this.backups.get(sessionKey) || [];
            sessionBackups.push(backup);
            this.backups.set(sessionKey, sessionBackups);
          }
        } catch (error) {
          console.error('Failed to load backup:', key, error);
        }
      }
    }
  }

  private async cleanupOldBackups(sessionKey: string): Promise<void> {
    const sessionBackups = this.backups.get(sessionKey) || [];

    if (sessionBackups.length > this.config.maxBackupsPerSession) {
      // Keep the most recent backups
      const sorted = sessionBackups.sort((a, b) => b.timestamp - a.timestamp);
      const toKeep = sorted.slice(0, this.config.maxBackupsPerSession);

      // Delete old backups from storage
      const toDelete = sorted.slice(this.config.maxBackupsPerSession);
      for (const backup of toDelete) {
        await this.deleteLocalBackup(backup);
      }

      this.backups.set(sessionKey, toKeep);
    }
  }

  private async compressData(data: Record<string, any>): Promise<Record<string, any>> {
    try {
      const jsonString = JSON.stringify(data);

      if (typeof CompressionStream !== 'undefined') {
        const compressed = await this.compressString(jsonString);
        return { _compressed: true, data: compressed };
      }

      return data;
    } catch (error) {
      console.warn('Data compression failed:', error);
      return data;
    }
  }

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

  private calculateDataSize(data: Record<string, any>): number {
    return JSON.stringify(data).length;
  }

  private getSessionKey(sessionId: string): string {
    return sessionId;
  }

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
    this.pendingBackups.clear();
  }
}

// Export singleton instance
export const backupManager = new BackupManager();
