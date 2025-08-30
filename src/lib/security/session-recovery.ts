/**
 * Session Recovery Manager
 *
 * Specialized component for handling exam session interruptions,
 * timeouts, and automatic restoration of session state.
 */

import { auditLogger } from './audit-logger';

export interface SessionState {
  examId: string;
  userId: string;
  sessionId: string;
  startTime: number;
  lastActivity: number;
  currentQuestionIndex: number;
  answers: Record<string, any>;
  timeRemaining: number;
  flags: string[];
  bookmarks: number[];
  notes: Record<string, string>;
  settings: {
    fontSize: 'small' | 'medium' | 'large';
    theme: 'light' | 'dark' | 'auto';
    showTimer: boolean;
    showProgress: boolean;
  };
}

export interface SessionRecoveryConfig {
  sessionTimeout: number; // in milliseconds
  warningThreshold: number; // in milliseconds before timeout
  autoSaveInterval: number; // in milliseconds
  maxRecoveryAttempts: number;
  enableAutoRecovery: boolean;
  recoveryTimeout: number; // in milliseconds
}

export interface RecoverySession {
  id: string;
  originalSessionId: string;
  recoveryStartTime: number;
  recoveryAttempts: number;
  lastRecoveryAttempt?: number;
  successful: boolean;
  recoveredState?: SessionState;
  errorMessage?: string;
}

export class SessionRecoveryManager {
  private config: SessionRecoveryConfig;
  private activeSessions = new Map<string, SessionState>();
  private recoverySessions = new Map<string, RecoverySession>();
  private autoSaveInterval?: NodeJS.Timeout;
  private warningTimeouts = new Map<string, NodeJS.Timeout>();
  private isInitialized = false;

  constructor(config: Partial<SessionRecoveryConfig> = {}) {
    this.config = {
      sessionTimeout: 1800000, // 30 minutes
      warningThreshold: 300000, // 5 minutes before timeout
      autoSaveInterval: 60000, // 1 minute
      maxRecoveryAttempts: 3,
      enableAutoRecovery: true,
      recoveryTimeout: 30000, // 30 seconds
      ...config
    };
  }

  /**
   * Initialize the session recovery manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.setupAutoSave();
      this.loadPersistedSessions();

      this.isInitialized = true;

      auditLogger.logExamSecurity('exam_started', {
        examId: 'system',
        userId: 'system',
        sessionId: 'system',
        severity: 'low',
        description: 'Session recovery manager initialized',
        metadata: { config: this.config }
      });
    } catch (error) {
      console.error('Failed to initialize session recovery manager:', error);
      throw error;
    }
  }

  /**
   * Start tracking a new exam session
   */
  startSession(sessionState: SessionState): void {
    const sessionKey = this.getSessionKey(sessionState);
    this.activeSessions.set(sessionKey, { ...sessionState });

    // Set up timeout warning
    this.setupTimeoutWarning(sessionState);

    // Set up session timeout
    this.setupSessionTimeout(sessionState);

    auditLogger.logExamSecurity('exam_started', {
      examId: sessionState.examId,
      userId: sessionState.userId,
      sessionId: sessionState.sessionId,
      severity: 'low',
      description: 'Exam session started with recovery tracking',
      metadata: {
        startTime: sessionState.startTime,
        timeRemaining: sessionState.timeRemaining
      }
    });
  }

  /**
   * Update session state
   */
  updateSession(sessionState: Partial<SessionState> & { examId: string; userId: string; sessionId: string }): void {
    const sessionKey = this.getSessionKey(sessionState);
    const existingSession = this.activeSessions.get(sessionKey);

    if (existingSession) {
      const updatedSession = { ...existingSession, ...sessionState, lastActivity: Date.now() };
      this.activeSessions.set(sessionKey, updatedSession);

      // Reset timeout warnings
      this.resetTimeoutWarning(updatedSession);
    }
  }

  /**
   * End session tracking
   */
  endSession(examId: string, userId: string, sessionId: string): void {
    const sessionKey = this.getSessionKey({ examId, userId, sessionId });

    // Clear timeouts
    this.clearTimeoutWarning(sessionKey);
    this.clearSessionTimeout(sessionKey);

    // Remove from active sessions
    const sessionState = this.activeSessions.get(sessionKey);
    if (sessionState) {
      this.persistSessionState(sessionState);
      this.activeSessions.delete(sessionKey);

      auditLogger.logExamSecurity('exam_completed', {
        examId,
        userId,
        sessionId,
        severity: 'low',
        description: 'Exam session ended, state persisted',
        metadata: {
          duration: Date.now() - sessionState.startTime,
          questionsAnswered: Object.keys(sessionState.answers).length
        }
      });
    }
  }

  /**
   * Handle session interruption
   */
  async handleSessionInterruption(
    examId: string,
    userId: string,
    sessionId: string,
    interruptionType: 'browser_crash' | 'network_loss' | 'user_action' | 'system_error'
  ): Promise<RecoverySession | null> {
    const sessionKey = this.getSessionKey({ examId, userId, sessionId });
    const sessionState = this.activeSessions.get(sessionKey);

    if (!sessionState) {
      console.warn(`No active session found for ${sessionKey}`);
      return null;
    }

    const recoverySession: RecoverySession = {
      id: this.generateRecoveryId(),
      originalSessionId: sessionId,
      recoveryStartTime: Date.now(),
      recoveryAttempts: 0,
      successful: false
    };

    this.recoverySessions.set(sessionKey, recoverySession);

    auditLogger.logExamSecurity('copy_paste', {
      examId,
      userId,
      sessionId,
      severity: 'high',
      description: `Session interruption detected: ${interruptionType}`,
      metadata: {
        interruptionType,
        recoverySessionId: recoverySession.id,
        lastActivity: sessionState.lastActivity
      }
    });

    // Attempt recovery if enabled
    if (this.config.enableAutoRecovery) {
      return await this.attemptSessionRecovery(sessionState, recoverySession, interruptionType);
    }

    return recoverySession;
  }

  /**
   * Attempt to recover a session
   */
  async attemptSessionRecovery(
    sessionState: SessionState,
    recoverySession: RecoverySession,
    interruptionType: string
  ): Promise<RecoverySession> {
    const maxAttempts = this.config.maxRecoveryAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      recoverySession.recoveryAttempts = attempt;
      recoverySession.lastRecoveryAttempt = Date.now();

      try {
        const recoveredState = await this.performRecovery(sessionState, interruptionType);

        if (recoveredState) {
          recoverySession.successful = true;
          recoverySession.recoveredState = recoveredState;

          // Restore the session
          const sessionKey = this.getSessionKey(sessionState);
          this.activeSessions.set(sessionKey, recoveredState);

          // Reset timeouts
          this.setupTimeoutWarning(recoveredState);
          this.setupSessionTimeout(recoveredState);

          auditLogger.logExamSecurity('copy_paste', {
            examId: sessionState.examId,
            userId: sessionState.userId,
            sessionId: sessionState.sessionId,
            severity: 'low',
            description: `Session recovery successful on attempt ${attempt}`,
            metadata: {
              recoverySessionId: recoverySession.id,
              interruptionType,
              attemptNumber: attempt
            }
          });

          return recoverySession;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        recoverySession.errorMessage = errorMessage;

        console.error(`Recovery attempt ${attempt} failed:`, error);
      }

      // Wait before next attempt (exponential backoff)
      if (attempt < maxAttempts) {
        await this.delay(Math.min(1000 * Math.pow(2, attempt - 1), 10000));
      }
    }

    // All recovery attempts failed
    recoverySession.errorMessage = `Failed to recover session after ${maxAttempts} attempts`;

    auditLogger.logExamSecurity('copy_paste', {
      examId: sessionState.examId,
      userId: sessionState.userId,
      sessionId: sessionState.sessionId,
      severity: 'critical',
      description: 'Session recovery failed after all attempts',
      metadata: {
        recoverySessionId: recoverySession.id,
        totalAttempts: maxAttempts,
        lastError: recoverySession.errorMessage
      }
    });

    return recoverySession;
  }

  /**
   * Get current session state
   */
  getSessionState(examId: string, userId: string, sessionId: string): SessionState | null {
    const sessionKey = this.getSessionKey({ examId, userId, sessionId });
    return this.activeSessions.get(sessionKey) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionState[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get recovery session details
   */
  getRecoverySession(examId: string, userId: string, sessionId: string): RecoverySession | null {
    const sessionKey = this.getSessionKey({ examId, userId, sessionId });
    return this.recoverySessions.get(sessionKey) || null;
  }

  /**
   * Check if session is about to timeout
   */
  isSessionAboutToTimeout(examId: string, userId: string, sessionId: string): boolean {
    const sessionState = this.getSessionState(examId, userId, sessionId);
    if (!sessionState) return false;

    const timeSinceActivity = Date.now() - sessionState.lastActivity;
    return timeSinceActivity > (this.config.sessionTimeout - this.config.warningThreshold);
  }

  /**
   * Extend session timeout
   */
  extendSessionTimeout(examId: string, userId: string, sessionId: string, extensionMinutes: number = 15): boolean {
    const sessionKey = this.getSessionKey({ examId, userId, sessionId });
    const sessionState = this.activeSessions.get(sessionKey);

    if (!sessionState) return false;

    // Add extension time
    const extensionMs = extensionMinutes * 60 * 1000;
    sessionState.timeRemaining += extensionMs;

    // Reset activity time
    sessionState.lastActivity = Date.now();

    // Reset timeouts
    this.clearTimeoutWarning(sessionKey);
    this.clearSessionTimeout(sessionKey);
    this.setupTimeoutWarning(sessionState);
    this.setupSessionTimeout(sessionState);

    auditLogger.logExamSecurity('copy_paste', {
      examId,
      userId,
      sessionId,
      severity: 'medium',
      description: `Session timeout extended by ${extensionMinutes} minutes`,
      metadata: {
        extensionMinutes,
        newTimeRemaining: sessionState.timeRemaining
      }
    });

    return true;
  }

  /**
   * Get session statistics
   */
  getSessionStatistics(): {
    activeSessions: number;
    totalRecoveryAttempts: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    averageRecoveryTime: number;
  } {
    const recoverySessions = Array.from(this.recoverySessions.values());
    const successfulRecoveries = recoverySessions.filter(r => r.successful);
    const failedRecoveries = recoverySessions.filter(r => !r.successful);

    const totalRecoveryTime = recoverySessions
      .filter(r => r.successful && r.lastRecoveryAttempt)
      .reduce((sum, r) => sum + (r.lastRecoveryAttempt! - r.recoveryStartTime), 0);

    const averageRecoveryTime = successfulRecoveries.length > 0
      ? totalRecoveryTime / successfulRecoveries.length
      : 0;

    return {
      activeSessions: this.activeSessions.size,
      totalRecoveryAttempts: recoverySessions.reduce((sum, r) => sum + r.recoveryAttempts, 0),
      successfulRecoveries: successfulRecoveries.length,
      failedRecoveries: failedRecoveries.length,
      averageRecoveryTime
    };
  }

  /**
   * Perform the actual recovery operation
   */
  private async performRecovery(sessionState: SessionState, interruptionType: string): Promise<SessionState | null> {
    // Simulate recovery time
    await this.delay(Math.random() * 5000 + 1000);

    // For this implementation, we'll assume recovery is successful
    // In a real implementation, this would involve:
    // 1. Validating session data integrity
    // 2. Restoring from backup if needed
    // 3. Reconnecting to exam server
    // 4. Synchronizing any pending changes

    const recoveredState: SessionState = {
      ...sessionState,
      lastActivity: Date.now()
    };

    return recoveredState;
  }

  /**
   * Set up timeout warning
   */
  private setupTimeoutWarning(sessionState: SessionState): void {
    const sessionKey = this.getSessionKey(sessionState);
    const warningTime = this.config.sessionTimeout - this.config.warningThreshold;

    const timeout = setTimeout(() => {
      this.emitTimeoutWarning(sessionState);
    }, warningTime);

    this.warningTimeouts.set(sessionKey, timeout);
  }

  /**
   * Reset timeout warning
   */
  private resetTimeoutWarning(sessionState: SessionState): void {
    const sessionKey = this.getSessionKey(sessionState);
    this.clearTimeoutWarning(sessionKey);
    this.setupTimeoutWarning(sessionState);
  }

  /**
   * Clear timeout warning
   */
  private clearTimeoutWarning(sessionKey: string): void {
    const timeout = this.warningTimeouts.get(sessionKey);
    if (timeout) {
      clearTimeout(timeout);
      this.warningTimeouts.delete(sessionKey);
    }
  }

  /**
   * Set up session timeout
   */
  private setupSessionTimeout(sessionState: SessionState): void {
    const sessionKey = this.getSessionKey(sessionState);

    const timeout = setTimeout(() => {
      this.handleSessionTimeout(sessionState);
    }, this.config.sessionTimeout);

    // Store timeout reference (we'd need another Map for this in a real implementation)
    // For now, we'll use a simple approach
  }

  /**
   * Clear session timeout
   */
  private clearSessionTimeout(sessionKey: string): void {
    // Implementation would clear the session timeout
    // This is simplified for the example
  }

  /**
   * Emit timeout warning
   */
  private emitTimeoutWarning(sessionState: SessionState): void {
    // Emit warning event (would integrate with the main event system)
    console.warn(`Session timeout warning for ${sessionState.sessionId}`);

    auditLogger.logExamSecurity('copy_paste', {
      examId: sessionState.examId,
      userId: sessionState.userId,
      sessionId: sessionState.sessionId,
      severity: 'medium',
      description: 'Session timeout warning emitted',
      metadata: {
        timeRemaining: this.config.warningThreshold,
        lastActivity: sessionState.lastActivity
      }
    });
  }

  /**
   * Handle session timeout
   */
  private handleSessionTimeout(sessionState: SessionState): void {
    console.warn(`Session timeout for ${sessionState.sessionId}`);

    // End the session
    this.endSession(sessionState.examId, sessionState.userId, sessionState.sessionId);

    auditLogger.logExamSecurity('copy_paste', {
      examId: sessionState.examId,
      userId: sessionState.userId,
      sessionId: sessionState.sessionId,
      severity: 'high',
      description: 'Session timeout - session ended',
      metadata: {
        sessionDuration: Date.now() - sessionState.startTime,
        lastActivity: sessionState.lastActivity
      }
    });
  }

  /**
   * Set up auto-save functionality
   */
  private setupAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      this.performAutoSave();
    }, this.config.autoSaveInterval);
  }

  /**
   * Perform auto-save of all active sessions
   */
  private performAutoSave(): void {
    for (const [sessionKey, sessionState] of this.activeSessions) {
      this.persistSessionState(sessionState);
    }
  }

  /**
   * Persist session state to storage
   */
  private persistSessionState(sessionState: SessionState): void {
    try {
      const storageKey = `exam_session_${this.getSessionKey(sessionState)}`;
      localStorage.setItem(storageKey, JSON.stringify({
        ...sessionState,
        persistedAt: Date.now()
      }));
    } catch (error) {
      console.error('Failed to persist session state:', error);
    }
  }

  /**
   * Load persisted sessions from storage
   */
  private loadPersistedSessions(): void {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('exam_session_')) {
          const data = localStorage.getItem(key);
          if (data) {
            const sessionState = JSON.parse(data);
            // Check if session is still valid (not too old)
            const age = Date.now() - sessionState.persistedAt;
            if (age < this.config.sessionTimeout) {
              this.activeSessions.set(key.replace('exam_session_', ''), sessionState);
            } else {
              // Clean up old session
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load persisted sessions:', error);
    }
  }

  /**
   * Get session key
   */
  private getSessionKey(session: { examId: string; userId: string; sessionId: string }): string {
    return `${session.examId}_${session.userId}_${session.sessionId}`;
  }

  /**
   * Generate recovery ID
   */
  private generateRecoveryId(): string {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    // Clear all timeouts
    for (const timeout of this.warningTimeouts.values()) {
      clearTimeout(timeout);
    }

    this.warningTimeouts.clear();
    this.activeSessions.clear();
    this.recoverySessions.clear();
  }
}

// Export singleton instance
export const sessionRecoveryManager = new SessionRecoveryManager();
