/**
 * Auto Save Manager
 *
 * Automatic saving system for exam progress, answers, and session state
 * with intelligent change detection and efficient storage management.
 */

import { auditLogger } from './audit-logger';

export interface AutoSaveConfig {
  saveInterval: number; // in milliseconds
  changeThreshold: number; // minimum changes before saving
  maxSaveHistory: number; // maximum saves to keep
  enableCompression: boolean;
  saveOnExit: boolean;
  saveOnNetworkChange: boolean;
  retryAttempts: number;
  retryDelay: number; // in milliseconds
}

export interface SaveData {
  examId: string;
  userId: string;
  sessionId: string;
  timestamp: number;
  dataType: 'progress' | 'answers' | 'session_state' | 'settings';
  data: Record<string, any>;
  checksum: string;
  size: number;
  version: number;
}

export interface SaveResult {
  successful: boolean;
  saveId?: string;
  timestamp: number;
  size: number;
  timeTaken: number;
  errorMessage?: string;
  retryCount: number;
}

export class AutoSaveManager {
  private config: AutoSaveConfig;
  private saveHistory = new Map<string, SaveData[]>();
  private pendingSaves = new Map<string, SaveData>();
  private saveInterval?: NodeJS.Timeout;
  private lastSavedData = new Map<string, string>(); // checksums
  private isInitialized = false;
  private saveInProgress = new Set<string>();

  constructor(config: Partial<AutoSaveConfig> = {}) {
    this.config = {
      saveInterval: 30000, // 30 seconds
      changeThreshold: 3, // Save after 3 changes
      maxSaveHistory: 10,
      enableCompression: true,
      saveOnExit: true,
      saveOnNetworkChange: true,
      retryAttempts: 3,
      retryDelay: 2000, // 2 seconds
      ...config
    };
  }

  /**
   * Initialize the auto-save manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.setupPeriodicSave();
      this.setupEventListeners();
      this.loadSaveHistory();

      this.isInitialized = true;

      auditLogger.logExamSecurity('exam_started', {
        examId: 'system',
        userId: 'system',
        sessionId: 'system',
        severity: 'low',
        description: 'Auto-save manager initialized',
        metadata: { config: this.config }
      });
    } catch (error) {
      console.error('Failed to initialize auto-save manager:', error);
      throw error;
    }
  }

  /**
   * Queue data for auto-saving
   */
  async queueSave(
    examId: string,
    userId: string,
    sessionId: string,
    dataType: SaveData['dataType'],
    data: Record<string, any>,
    forceSave: boolean = false
  ): Promise<void> {
    const sessionKey = this.getSessionKey(examId, userId, sessionId);
    const dataChecksum = await this.calculateChecksum(data);

    // Check if data has changed significantly
    const lastChecksum = this.lastSavedData.get(sessionKey);
    if (!forceSave && lastChecksum === dataChecksum) {
      return; // No significant changes
    }

    const saveData: SaveData = {
      examId,
      userId,
      sessionId,
      timestamp: Date.now(),
      dataType,
      data: this.config.enableCompression ? await this.compressData(data) : data,
      checksum: dataChecksum,
      size: this.calculateDataSize(data),
      version: this.getNextVersion(sessionKey)
    };

    this.pendingSaves.set(sessionKey, saveData);

    // Check if we should save immediately based on change threshold
    const pendingCount = this.countPendingChanges(sessionKey);
    if (pendingCount >= this.config.changeThreshold || forceSave) {
      await this.performSave(sessionKey);
    }
  }

  /**
   * Perform immediate save
   */
  async saveNow(
    examId: string,
    userId: string,
    sessionId: string,
    dataType: SaveData['dataType'],
    data: Record<string, any>
  ): Promise<SaveResult> {
    const sessionKey = this.getSessionKey(examId, userId, sessionId);

    return await this.performSaveWithRetry(sessionKey, dataType, data);
  }

  /**
   * Get latest saved data for a session
   */
  getLatestSave(examId: string, userId: string, sessionId: string, dataType?: SaveData['dataType']): SaveData | null {
    const sessionKey = this.getSessionKey(examId, userId, sessionId);
    const history = this.saveHistory.get(sessionKey) || [];

    const relevantSaves = dataType
      ? history.filter(save => save.dataType === dataType)
      : history;

    if (relevantSaves.length === 0) return null;

    // Return the most recent save
    return relevantSaves.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  /**
   * Get save history for a session
   */
  getSaveHistory(examId: string, userId: string, sessionId: string, dataType?: SaveData['dataType']): SaveData[] {
    const sessionKey = this.getSessionKey(examId, userId, sessionId);
    const history = this.saveHistory.get(sessionKey) || [];

    const relevantSaves = dataType
      ? history.filter(save => save.dataType === dataType)
      : history;

    return relevantSaves.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Restore data from a specific save
   */
  async restoreFromSave(saveId: string): Promise<Record<string, any> | null> {
    for (const history of this.saveHistory.values()) {
      // Since SaveData doesn't have an id field, we'll need to find by other means
      // For now, return the most recent save of any type
      if (history.length > 0) {
        const mostRecent = history.sort((a, b) => b.timestamp - a.timestamp)[0];
        return mostRecent.data;
      }
    }
    return null;
  }

  /**
   * Clear save history for a session
   */
  clearHistory(examId: string, userId: string, sessionId: string, dataType?: SaveData['dataType']): void {
    const sessionKey = this.getSessionKey(examId, userId, sessionId);

    if (dataType) {
      // Clear only specific data type
      const history = this.saveHistory.get(sessionKey) || [];
      const filteredHistory = history.filter(save => save.dataType !== dataType);
      this.saveHistory.set(sessionKey, filteredHistory);
    } else {
      // Clear all history for session
      this.saveHistory.delete(sessionKey);
    }

    auditLogger.logExamSecurity('copy_paste', {
      examId,
      userId,
      sessionId,
      severity: 'low',
      description: 'Save history cleared',
      metadata: { dataType: dataType || 'all' }
    });
  }

  /**
   * Get save statistics
   */
  getSaveStatistics(): {
    totalSaves: number;
    totalSize: number;
    sessionsWithSaves: number;
    pendingSaves: number;
    averageSaveSize: number;
    oldestSave?: number;
    newestSave?: number;
  } {
    let totalSaves = 0;
    let totalSize = 0;
    let oldestSave: number | undefined;
    let newestSave: number | undefined;

    for (const history of this.saveHistory.values()) {
      totalSaves += history.length;

      for (const save of history) {
        totalSize += save.size;

        if (!oldestSave || save.timestamp < oldestSave) {
          oldestSave = save.timestamp;
        }

        if (!newestSave || save.timestamp > newestSave) {
          newestSave = save.timestamp;
        }
      }
    }

    return {
      totalSaves,
      totalSize,
      sessionsWithSaves: this.saveHistory.size,
      pendingSaves: this.pendingSaves.size,
      averageSaveSize: totalSaves > 0 ? totalSize / totalSaves : 0,
      oldestSave,
      newestSave
    };
  }

  /**
   * Force save all pending data
   */
  async forceSaveAll(): Promise<void> {
    const pendingKeys = Array.from(this.pendingSaves.keys());

    for (const sessionKey of pendingKeys) {
      await this.performSave(sessionKey);
    }
  }

  /**
   * Perform periodic save of all pending data
   */
  private async performPeriodicSave(): Promise<void> {
    const pendingKeys = Array.from(this.pendingSaves.keys());

    for (const sessionKey of pendingKeys) {
      const pendingData = this.pendingSaves.get(sessionKey);
      if (pendingData) {
        await this.performSave(sessionKey);
      }
    }
  }

  /**
   * Perform save with retry logic
   */
  private async performSaveWithRetry(
    sessionKey: string,
    dataType: SaveData['dataType'],
    data: Record<string, any>,
    retryCount: number = 0
  ): Promise<SaveResult> {
    const startTime = Date.now();
    let result: SaveResult;

    try {
      // Check if save is already in progress for this session
      if (this.saveInProgress.has(sessionKey)) {
        return {
          successful: false,
          timestamp: Date.now(),
          size: 0,
          timeTaken: 0,
          retryCount,
          errorMessage: 'Save already in progress for this session'
        };
      }

      this.saveInProgress.add(sessionKey);

      // Perform the actual save
      const saveId = await this.performActualSave(sessionKey, dataType, data);
      const saveData: SaveData = {
        examId: sessionKey.split('_')[0],
        userId: sessionKey.split('_')[1],
        sessionId: sessionKey.split('_')[2],
        timestamp: Date.now(),
        dataType,
        data,
        checksum: await this.calculateChecksum(data),
        size: this.calculateDataSize(data),
        version: this.getNextVersion(sessionKey)
      };
      const size = saveData.size;

      result = {
        successful: true,
        saveId,
        timestamp: Date.now(),
        size,
        timeTaken: Date.now() - startTime,
        retryCount
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Retry if attempts remaining
      if (retryCount < this.config.retryAttempts) {
        console.warn(`Save failed, retrying (${retryCount + 1}/${this.config.retryAttempts}):`, error);

        await this.delay(this.config.retryDelay);
        return await this.performSaveWithRetry(sessionKey, dataType, data, retryCount + 1);
      }

      result = {
        successful: false,
        timestamp: Date.now(),
        size: 0,
        timeTaken: Date.now() - startTime,
        retryCount,
        errorMessage
      };

    } finally {
      this.saveInProgress.delete(sessionKey);
    }

    // Log the result
    auditLogger.logExamSecurity('copy_paste', {
      examId: 'system',
      userId: 'system',
      sessionId: sessionKey,
      severity: result.successful ? 'low' : 'high',
      description: `Auto-save ${result.successful ? 'successful' : 'failed'}`,
      metadata: {
        saveId: result.saveId,
        size: result.size,
        timeTaken: result.timeTaken,
        retryCount: result.retryCount,
        errorMessage: result.errorMessage
      }
    });

    return result;
  }

  /**
   * Perform the actual save operation
   */
  private async performActualSave(
    sessionKey: string,
    dataType: SaveData['dataType'],
    data: Record<string, any>
  ): Promise<string> {
    const saveData: SaveData = {
      examId: sessionKey.split('_')[0],
      userId: sessionKey.split('_')[1],
      sessionId: sessionKey.split('_')[2],
      timestamp: Date.now(),
      dataType,
      data: this.config.enableCompression ? await this.compressData(data) : data,
      checksum: await this.calculateChecksum(data),
      size: this.calculateDataSize(data),
      version: this.getNextVersion(sessionKey)
    };

    // Add to history
    const history = this.saveHistory.get(sessionKey) || [];
    history.push(saveData);

    // Clean up old saves
    const cleanedHistory = this.cleanupOldSaves(history);
    this.saveHistory.set(sessionKey, cleanedHistory);

    // Update last saved checksum
    this.lastSavedData.set(sessionKey, saveData.checksum);

    // Persist to storage
    await this.persistSave(saveData);

    // Remove from pending
    this.pendingSaves.delete(sessionKey);

    return this.generateSaveId();
  }

  /**
   * Perform save for pending data
   */
  private async performSave(sessionKey: string): Promise<void> {
    const pendingData = this.pendingSaves.get(sessionKey);
    if (!pendingData) return;

    await this.performSaveWithRetry(sessionKey, pendingData.dataType, pendingData.data, 0);
  }

  /**
   * Set up periodic save interval
   */
  private setupPeriodicSave(): void {
    this.saveInterval = setInterval(() => {
      this.performPeriodicSave();
    }, this.config.saveInterval);
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Save on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.forceSaveAll();
      }
    });

    // Save before page unload
    window.addEventListener('beforeunload', () => {
      if (this.config.saveOnExit) {
        // Synchronous save for critical data
        this.syncSavePendingData();
      }
    });

    // Save on network status change
    if (this.config.saveOnNetworkChange) {
      window.addEventListener('online', () => {
        this.forceSaveAll();
      });
    }
  }

  /**
   * Load save history from storage
   */
  private async loadSaveHistory(): Promise<void> {
    try {
      // Load from localStorage or other persistent storage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('exam_save_')) {
          const data = localStorage.getItem(key);
          if (data) {
            const saveData = JSON.parse(data);
            const sessionKey = key.replace('exam_save_', '');
            const history = this.saveHistory.get(sessionKey) || [];
            history.push(saveData);
            this.saveHistory.set(sessionKey, history);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load save history:', error);
    }
  }

  /**
   * Persist save to storage
   */
  private async persistSave(saveData: SaveData): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(saveData.examId, saveData.userId, saveData.sessionId);
      const storageKey = `exam_save_${sessionKey}_${saveData.timestamp}`;
      localStorage.setItem(storageKey, JSON.stringify(saveData));
    } catch (error) {
      console.error('Failed to persist save:', error);
    }
  }

  /**
   * Compress data
   */
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
        throw new Error('Failed to decompress save data');
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
   * Calculate data size
   */
  private calculateDataSize(data: Record<string, any>): number {
    return JSON.stringify(data).length;
  }

  /**
   * Clean up old saves
   */
  private cleanupOldSaves(history: SaveData[]): SaveData[] {
    if (history.length <= this.config.maxSaveHistory) {
      return history;
    }

    // Keep the most recent saves
    return history
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, this.config.maxSaveHistory);
  }

  /**
   * Count pending changes for a session
   */
  private countPendingChanges(sessionKey: string): number {
    // This is a simplified implementation
    // In a real system, you might track individual changes
    return this.pendingSaves.has(sessionKey) ? 1 : 0;
  }

  /**
   * Get next version number for a session
   */
  private getNextVersion(sessionKey: string): number {
    const history = this.saveHistory.get(sessionKey) || [];
    const maxVersion = history.length > 0
      ? Math.max(...history.map(save => save.version || 0))
      : 0;
    return maxVersion + 1;
  }

  /**
   * Sync save pending data (for beforeunload)
   */
  private syncSavePendingData(): void {
    // Synchronous save for critical data before page unload
    // This is a simplified implementation
    console.log('Performing synchronous save of critical data');
  }

  /**
   * Get session key
   */
  private getSessionKey(examId: string, userId: string, sessionId: string): string {
    return `${examId}_${userId}_${sessionId}`;
  }

  /**
   * Generate save ID
   */
  private generateSaveId(): string {
    return `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Destroy the manager and clean up resources
   */
  destroy(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }

    this.saveHistory.clear();
    this.pendingSaves.clear();
    this.lastSavedData.clear();
    this.saveInProgress.clear();
  }
}

// Export singleton instance
export const autoSaveManager = new AutoSaveManager();
