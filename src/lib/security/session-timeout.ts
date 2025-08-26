/**
 * Session Timeout Management System
 * 
 * This module provides comprehensive session timeout management with
 * configurable policies for different user roles and exam scenarios.
 */

export interface SessionTimeoutConfig {
  role: 'SUPER_ADMIN' | 'COLLEGE_ADMIN' | 'TEACHER' | 'STUDENT';
  defaultTimeout: number; // in minutes
  examTimeout: number; // in minutes
  warningThreshold: number; // in minutes before timeout
  extendable: boolean;
  maxExtensions: number;
  extensionDuration: number; // in minutes
  idleTimeout: number; // in minutes of inactivity
  absoluteTimeout: number; // maximum session duration in minutes
}

export interface SessionTimeoutPolicy {
  id: string;
  name: string;
  description: string;
  configs: SessionTimeoutConfig[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SessionTimeoutStatus {
  sessionId: string;
  userId: string;
  role: string;
  startTime: number;
  lastActivity: number;
  timeoutAt: number;
  warningAt: number;
  isWarningActive: boolean;
  extensionsUsed: number;
  maxExtensions: number;
  canExtend: boolean;
  timeRemaining: number; // in seconds
  warningTimeRemaining: number; // in seconds
  isExpired: boolean;
  isIdle: boolean;
  idleTimeRemaining: number; // in seconds
}

export interface TimeoutEvent {
  id: string;
  sessionId: string;
  userId: string;
  eventType: 'session_start' | 'activity' | 'warning' | 'extension' | 'timeout' | 'idle_timeout' | 'absolute_timeout';
  timestamp: number;
  details: Record<string, any>;
}

class SessionTimeoutService {
  private static instance: SessionTimeoutService;
  private sessions: Map<string, SessionTimeoutStatus> = new Map();
  private policies: Map<string, SessionTimeoutPolicy> = new Map();
  private events: TimeoutEvent[] = [];
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private warningTimers: Map<string, NodeJS.Timeout> = new Map();
  private idleTimers: Map<string, NodeJS.Timeout> = new Map();

  // Default policies
  private defaultPolicies: SessionTimeoutPolicy[] = [
    {
      id: 'default',
      name: 'Default Policy',
      description: 'Default session timeout policy for all users',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      configs: [
        {
          role: 'SUPER_ADMIN',
          defaultTimeout: 480, // 8 hours
          examTimeout: 180, // 3 hours
          warningThreshold: 15, // 15 minutes
          extendable: true,
          maxExtensions: 3,
          extensionDuration: 60, // 1 hour
          idleTimeout: 30, // 30 minutes
          absoluteTimeout: 720, // 12 hours
        },
        {
          role: 'COLLEGE_ADMIN',
          defaultTimeout: 240, // 4 hours
          examTimeout: 180, // 3 hours
          warningThreshold: 10, // 10 minutes
          extendable: true,
          maxExtensions: 2,
          extensionDuration: 30, // 30 minutes
          idleTimeout: 20, // 20 minutes
          absoluteTimeout: 480, // 8 hours
        },
        {
          role: 'TEACHER',
          defaultTimeout: 180, // 3 hours
          examTimeout: 120, // 2 hours
          warningThreshold: 10, // 10 minutes
          extendable: true,
          maxExtensions: 2,
          extensionDuration: 30, // 30 minutes
          idleTimeout: 15, // 15 minutes
          absoluteTimeout: 360, // 6 hours
        },
        {
          role: 'STUDENT',
          defaultTimeout: 120, // 2 hours
          examTimeout: 90, // 1.5 hours
          warningThreshold: 5, // 5 minutes
          extendable: false,
          maxExtensions: 0,
          extensionDuration: 0,
          idleTimeout: 10, // 10 minutes
          absoluteTimeout: 240, // 4 hours
        },
      ],
    },
  ];

  static getInstance(): SessionTimeoutService {
    if (!SessionTimeoutService.instance) {
      SessionTimeoutService.instance = new SessionTimeoutService();
      SessionTimeoutService.instance.initializeDefaultPolicies();
    }
    return SessionTimeoutService.instance;
  }

  /**
   * Initialize default policies
   */
  private initializeDefaultPolicies(): void {
    for (const policy of this.defaultPolicies) {
      this.policies.set(policy.id, policy);
    }
  }

  /**
   * Start session timeout monitoring
   */
  startSession(
    sessionId: string,
    userId: string,
    role: string,
    isExam: boolean = false,
    policyId: string = 'default'
  ): SessionTimeoutStatus {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const config = policy.configs.find(c => c.role === role);
    if (!config) {
      throw new Error(`No timeout configuration found for role ${role}`);
    }

    const now = Date.now();
    const timeoutDuration = isExam ? config.examTimeout : config.defaultTimeout;
    const timeoutAt = now + (timeoutDuration * 60 * 1000);
    const warningAt = timeoutAt - (config.warningThreshold * 60 * 1000);

    const status: SessionTimeoutStatus = {
      sessionId,
      userId,
      role,
      startTime: now,
      lastActivity: now,
      timeoutAt,
      warningAt,
      isWarningActive: false,
      extensionsUsed: 0,
      maxExtensions: config.maxExtensions,
      canExtend: config.extendable,
      timeRemaining: timeoutDuration * 60,
      warningTimeRemaining: config.warningThreshold * 60,
      isExpired: false,
      isIdle: false,
      idleTimeRemaining: config.idleTimeout * 60,
    };

    this.sessions.set(sessionId, status);

    // Set up timers
    this.setupSessionTimers(sessionId, config);

    // Record session start event
    this.recordEvent({
      sessionId,
      userId,
      eventType: 'session_start',
      timestamp: now,
      details: {
        role,
        isExam,
        policyId,
        timeoutDuration,
        warningThreshold: config.warningThreshold,
      },
    });

    return { ...status };
  }

  /**
   * Update session activity
   */
  updateActivity(sessionId: string): SessionTimeoutStatus | null {
    const status = this.sessions.get(sessionId);
    if (!status || status.isExpired) {
      return null;
    }

    const now = Date.now();
    const config = this.getConfigForRole(status.role);
    
    if (!config) {
      return null;
    }

    // Update last activity
    status.lastActivity = now;
    status.isIdle = false;

    // Reset idle timer
    this.resetIdleTimer(sessionId, config);

    // Record activity event
    this.recordEvent({
      sessionId,
      userId: status.userId,
      eventType: 'activity',
      timestamp: now,
      details: {
        timeSinceLastActivity: now - status.lastActivity,
      },
    });

    return { ...status };
  }

  /**
   * Extend session timeout
   */
  extendSession(sessionId: string, userId: string): {
    success: boolean;
    newTimeoutAt: number;
    extensionsRemaining: number;
    message: string;
  } {
    const status = this.sessions.get(sessionId);
    if (!status || status.isExpired) {
      return {
        success: false,
        newTimeoutAt: 0,
        extensionsRemaining: 0,
        message: 'Session not found or expired',
      };
    }

    const config = this.getConfigForRole(status.role);
    if (!config) {
      return {
        success: false,
        newTimeoutAt: 0,
        extensionsRemaining: 0,
        message: 'Configuration not found',
      };
    }

    if (!status.canExtend || status.extensionsUsed >= status.maxExtensions) {
      return {
        success: false,
        newTimeoutAt: status.timeoutAt,
        extensionsRemaining: status.maxExtensions - status.extensionsUsed,
        message: 'No extensions remaining',
      };
    }

    // Extend the session
    const extensionMs = config.extensionDuration * 60 * 1000;
    status.timeoutAt += extensionMs;
    status.warningAt = status.timeoutAt - (config.warningThreshold * 60 * 1000);
    status.extensionsUsed++;
    status.timeRemaining = Math.max(0, Math.floor((status.timeoutAt - Date.now()) / 1000));

    // Update timers
    this.updateSessionTimers(sessionId, config);

    // Record extension event
    this.recordEvent({
      sessionId,
      userId: status.userId,
      eventType: 'extension',
      timestamp: Date.now(),
      details: {
        extensionDuration: config.extensionDuration,
        extensionsUsed: status.extensionsUsed,
        newTimeoutAt: status.timeoutAt,
      },
    });

    return {
      success: true,
      newTimeoutAt: status.timeoutAt,
      extensionsRemaining: status.maxExtensions - status.extensionsUsed,
      message: `Session extended by ${config.extensionDuration} minutes`,
    };
  }

  /**
   * Get session timeout status
   */
  getSessionStatus(sessionId: string): SessionTimeoutStatus | null {
    const status = this.sessions.get(sessionId);
    if (!status) {
      return null;
    }

    const now = Date.now();
    const config = this.getConfigForRole(status.role);
    
    if (!config) {
      return null;
    }

    // Update calculated fields
    status.timeRemaining = Math.max(0, Math.floor((status.timeoutAt - now) / 1000));
    status.warningTimeRemaining = Math.max(0, Math.floor((status.warningAt - now) / 1000));
    status.isExpired = now >= status.timeoutAt;
    status.isIdle = now - status.lastActivity > (config.idleTimeout * 60 * 1000);
    status.idleTimeRemaining = Math.max(0, Math.floor(((status.lastActivity + config.idleTimeout * 60 * 1000) - now) / 1000));

    return { ...status };
  }

  /**
   * End session
   */
  endSession(sessionId: string, reason: string = 'manual'): boolean {
    const status = this.sessions.get(sessionId);
    if (!status) {
      return false;
    }

    // Clear timers
    this.clearSessionTimers(sessionId);

    // Record timeout event
    this.recordEvent({
      sessionId,
      userId: status.userId,
      eventType: 'timeout',
      timestamp: Date.now(),
      details: {
        reason,
        sessionDuration: Date.now() - status.startTime,
        extensionsUsed: status.extensionsUsed,
      },
    });

    // Remove session
    this.sessions.delete(sessionId);

    return true;
  }

  /**
   * Check if session is valid
   */
  isSessionValid(sessionId: string): boolean {
    const status = this.getSessionStatus(sessionId);
    return status !== null && !status.isExpired;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionTimeoutStatus[] {
    const activeSessions: SessionTimeoutStatus[] = [];
    
    for (const sessionId of this.sessions.keys()) {
      const status = this.getSessionStatus(sessionId);
      if (status && !status.isExpired) {
        activeSessions.push(status);
      }
    }

    return activeSessions;
  }

  /**
   * Get timeout events for a session
   */
  getSessionEvents(sessionId: string): TimeoutEvent[] {
    return this.events
      .filter(event => event.sessionId === sessionId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Create a new timeout policy
   */
  createPolicy(policy: Omit<SessionTimeoutPolicy, 'id' | 'createdAt' | 'updatedAt'>): SessionTimeoutPolicy {
    const newPolicy: SessionTimeoutPolicy = {
      ...policy,
      id: this.generatePolicyId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.policies.set(newPolicy.id, newPolicy);
    return newPolicy;
  }

  /**
   * Update an existing policy
   */
  updatePolicy(policyId: string, updates: Partial<SessionTimeoutPolicy>): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return false;
    }

    const updatedPolicy: SessionTimeoutPolicy = {
      ...policy,
      ...updates,
      id: policyId, // Ensure ID doesn't change
      updatedAt: Date.now(),
    };

    this.policies.set(policyId, updatedPolicy);
    return true;
  }

  /**
   * Get all policies
   */
  getPolicies(): SessionTimeoutPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get active policy
   */
  getActivePolicy(): SessionTimeoutPolicy | null {
    return Array.from(this.policies.values()).find(policy => policy.isActive) || null;
  }

  /**
   * Set up session timers
   */
  private setupSessionTimers(sessionId: string, config: SessionTimeoutConfig): void {
    const status = this.sessions.get(sessionId);
    if (!status) {
      return;
    }

    const now = Date.now();

    // Warning timer
    if (status.warningAt > now) {
      const warningTimer = setTimeout(() => {
        this.handleWarning(sessionId);
      }, status.warningAt - now);
      this.warningTimers.set(sessionId, warningTimer);
    }

    // Timeout timer
    const timeoutTimer = setTimeout(() => {
      this.handleTimeout(sessionId);
    }, status.timeoutAt - now);
    this.timers.set(sessionId, timeoutTimer);

    // Idle timer
    this.resetIdleTimer(sessionId, config);
  }

  /**
   * Update session timers
   */
  private updateSessionTimers(sessionId: string, config: SessionTimeoutConfig): void {
    // Clear existing timers
    this.clearSessionTimers(sessionId);
    
    // Set up new timers
    this.setupSessionTimers(sessionId, config);
  }

  /**
   * Reset idle timer
   */
  private resetIdleTimer(sessionId: string, config: SessionTimeoutConfig): void {
    const existingTimer = this.idleTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const idleTimer = setTimeout(() => {
      this.handleIdleTimeout(sessionId);
    }, config.idleTimeout * 60 * 1000);
    
    this.idleTimers.set(sessionId, idleTimer);
  }

  /**
   * Clear session timers
   */
  private clearSessionTimers(sessionId: string): void {
    const timeoutTimer = this.timers.get(sessionId);
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      this.timers.delete(sessionId);
    }

    const warningTimer = this.warningTimers.get(sessionId);
    if (warningTimer) {
      clearTimeout(warningTimer);
      this.warningTimers.delete(sessionId);
    }

    const idleTimer = this.idleTimers.get(sessionId);
    if (idleTimer) {
      clearTimeout(idleTimer);
      this.idleTimers.delete(sessionId);
    }
  }

  /**
   * Handle warning
   */
  private handleWarning(sessionId: string): void {
    const status = this.sessions.get(sessionId);
    if (!status) {
      return;
    }

    status.isWarningActive = true;

    // Record warning event
    this.recordEvent({
      sessionId,
      userId: status.userId,
      eventType: 'warning',
      timestamp: Date.now(),
      details: {
        timeRemaining: status.timeRemaining,
        canExtend: status.canExtend,
        extensionsRemaining: status.maxExtensions - status.extensionsUsed,
      },
    });

    // In a real implementation, you would:
    // 1. Send notification to user
    // 2. Show warning modal
    // 3. Play warning sound
    console.warn(`[SESSION TIMEOUT] Warning for session ${sessionId}: ${status.timeRemaining} seconds remaining`);
  }

  /**
   * Handle timeout
   */
  private handleTimeout(sessionId: string): void {
    const status = this.sessions.get(sessionId);
    if (!status) {
      return;
    }

    status.isExpired = true;

    // Record timeout event
    this.recordEvent({
      sessionId,
      userId: status.userId,
      eventType: 'timeout',
      timestamp: Date.now(),
      details: {
        sessionDuration: Date.now() - status.startTime,
        extensionsUsed: status.extensionsUsed,
      },
    });

    // Clear timers
    this.clearSessionTimers(sessionId);

    // In a real implementation, you would:
    // 1. Force logout user
    // 2. Save session state
    // 3. Redirect to login page
    // 4. Notify administrators
    console.error(`[SESSION TIMEOUT] Session ${sessionId} has expired`);
  }

  /**
   * Handle idle timeout
   */
  private handleIdleTimeout(sessionId: string): void {
    const status = this.sessions.get(sessionId);
    if (!status) {
      return;
    }

    status.isIdle = true;

    // Record idle timeout event
    this.recordEvent({
      sessionId,
      userId: status.userId,
      eventType: 'idle_timeout',
      timestamp: Date.now(),
      details: {
        idleDuration: Date.now() - status.lastActivity,
      },
    });

    // In a real implementation, you would:
    // 1. Show idle warning
    // 2. Start countdown to logout
    // 3. Allow user to extend session
    console.warn(`[SESSION TIMEOUT] Session ${sessionId} is idle`);
  }

  /**
   * Get configuration for role
   */
  private getConfigForRole(role: string): SessionTimeoutConfig | null {
    const activePolicy = this.getActivePolicy();
    if (!activePolicy) {
      return null;
    }

    return activePolicy.configs.find(config => config.role === role) || null;
  }

  /**
   * Record timeout event
   */
  private recordEvent(event: Omit<TimeoutEvent, 'id'>): void {
    const timeoutEvent: TimeoutEvent = {
      ...event,
      id: this.generateEventId(),
    };

    this.events.push(timeoutEvent);

    // Keep only last 10000 events
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }
  }

  /**
   * Generate unique IDs
   */
  private generatePolicyId(): string {
    return 'policy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateEventId(): string {
    return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, status] of this.sessions.entries()) {
      if (now >= status.timeoutAt) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.endSession(sessionId, 'cleanup');
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    activeSessions: number;
    expiredSessions: number;
    totalEvents: number;
    policies: number;
  } {
    const activeSessions = this.getActiveSessions().length;
    const expiredSessions = this.sessions.size - activeSessions;

    return {
      activeSessions,
      expiredSessions,
      totalEvents: this.events.length,
      policies: this.policies.size,
    };
  }
}

export const sessionTimeoutService = SessionTimeoutService.getInstance();
export default sessionTimeoutService;
