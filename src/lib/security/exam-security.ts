/**
 * Exam-Specific Security Measures
 * 
 * This module provides comprehensive exam security features including
 * browser lock detection, tab switching prevention, and full-screen enforcement.
 */

export interface ExamSecurityConfig {
  examId: string;
  userId: string;
  sessionId: string;
  startTime: number;
  endTime: number;
  duration: number; // in minutes
  allowTabSwitch: boolean;
  requireFullScreen: boolean;
  enableBrowserLock: boolean;
  enableCopyPaste: boolean;
  enableRightClick: boolean;
  enableDevTools: boolean;
  maxTabSwitches: number;
  maxWindowBlurs: number;
  screenshotInterval: number; // in seconds
  heartbeatInterval: number; // in seconds
}

export interface ExamSecurityEvent {
  id: string;
  examId: string;
  userId: string;
  sessionId: string;
  eventType: 'tab_switch' | 'window_blur' | 'fullscreen_exit' | 'copy_paste' | 'right_click' | 'dev_tools' | 'screenshot' | 'heartbeat' | 'violation';
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  action: 'warn' | 'log' | 'block' | 'terminate';
}

export interface ExamSecurityStatus {
  examId: string;
  userId: string;
  sessionId: string;
  isActive: boolean;
  violations: number;
  tabSwitches: number;
  windowBlurs: number;
  isFullScreen: boolean;
  isBrowserLocked: boolean;
  lastHeartbeat: number;
  securityScore: number; // 0-100
  warnings: string[];
  canContinue: boolean;
  timeRemaining: number; // in seconds
}

class ExamSecurityService {
  private static instance: ExamSecurityService;
  private activeExams: Map<string, ExamSecurityConfig> = new Map();
  private examEvents: Map<string, ExamSecurityEvent[]> = new Map();
  private securityStatus: Map<string, ExamSecurityStatus> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private screenshotIntervals: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): ExamSecurityService {
    if (!ExamSecurityService.instance) {
      ExamSecurityService.instance = new ExamSecurityService();
    }
    return ExamSecurityService.instance;
  }

  /**
   * Start exam security monitoring
   */
  startExamSecurity(config: ExamSecurityConfig): void {
    const examKey = `${config.examId}_${config.userId}_${config.sessionId}`;
    
    this.activeExams.set(examKey, config);
    
    // Initialize security status
    this.securityStatus.set(examKey, {
      examId: config.examId,
      userId: config.userId,
      sessionId: config.sessionId,
      isActive: true,
      violations: 0,
      tabSwitches: 0,
      windowBlurs: 0,
      isFullScreen: false,
      isBrowserLocked: false,
      lastHeartbeat: Date.now(),
      securityScore: 100,
      warnings: [],
      canContinue: true,
      timeRemaining: config.duration * 60,
    });

    // Initialize events array
    this.examEvents.set(examKey, []);

    // Start heartbeat monitoring
    this.startHeartbeat(examKey, config.heartbeatInterval);

    // Start screenshot monitoring if enabled
    if (config.screenshotInterval > 0) {
      this.startScreenshotMonitoring(examKey, config.screenshotInterval);
    }

    // Set up event listeners
    this.setupEventListeners(examKey, config);
  }

  /**
   * Stop exam security monitoring
   */
  stopExamSecurity(examId: string, userId: string, sessionId: string): void {
    const examKey = `${examId}_${userId}_${sessionId}`;
    
    this.activeExams.delete(examKey);
    this.securityStatus.delete(examKey);
    this.examEvents.delete(examKey);

    // Clear intervals
    const heartbeatInterval = this.heartbeatIntervals.get(examKey);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      this.heartbeatIntervals.delete(examKey);
    }

    const screenshotInterval = this.screenshotIntervals.get(examKey);
    if (screenshotInterval) {
      clearInterval(screenshotInterval);
      this.screenshotIntervals.delete(examKey);
    }

    // Remove event listeners
    this.removeEventListeners(examKey);
  }

  /**
   * Record a security event
   */
  recordEvent(event: Omit<ExamSecurityEvent, 'id' | 'timestamp'>): void {
    const examKey = `${event.examId}_${event.userId}_${event.sessionId}`;
    const examConfig = this.activeExams.get(examKey);
    const status = this.securityStatus.get(examKey);

    if (!examConfig || !status) {
      return;
    }

    const securityEvent: ExamSecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
    };

    // Add event to history
    const events = this.examEvents.get(examKey) || [];
    events.push(securityEvent);
    this.examEvents.set(examKey, events);

    // Update security status based on event type
    this.updateSecurityStatus(examKey, securityEvent, examConfig, status);

    // Take action based on event severity
    this.handleSecurityEvent(securityEvent, examConfig, status);
  }

  /**
   * Get current security status
   */
  getSecurityStatus(examId: string, userId: string, sessionId: string): ExamSecurityStatus | null {
    const examKey = `${examId}_${userId}_${sessionId}`;
    return this.securityStatus.get(examKey) || null;
  }

  /**
   * Get security events for an exam
   */
  getSecurityEvents(examId: string, userId: string, sessionId: string): ExamSecurityEvent[] {
    const examKey = `${examId}_${userId}_${sessionId}`;
    return this.examEvents.get(examKey) || [];
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(examKey: string, interval: number): void {
    const heartbeatInterval = setInterval(() => {
      const config = this.activeExams.get(examKey);
      const status = this.securityStatus.get(examKey);

      if (!config || !status) {
        clearInterval(heartbeatInterval);
        return;
      }

      // Record heartbeat
      this.recordEvent({
        examId: config.examId,
        userId: config.userId,
        sessionId: config.sessionId,
        eventType: 'heartbeat',
        severity: 'low',
        details: {
          timestamp: Date.now(),
          timeRemaining: status.timeRemaining,
        },
        action: 'log',
      });

      // Update time remaining
      status.timeRemaining = Math.max(0, status.timeRemaining - interval);
      status.lastHeartbeat = Date.now();

      // Check if exam time has expired
      if (status.timeRemaining <= 0) {
        this.recordEvent({
          examId: config.examId,
          userId: config.userId,
          sessionId: config.sessionId,
          eventType: 'violation',
          severity: 'critical',
          details: {
            reason: 'time_expired',
            message: 'Exam time has expired',
          },
          action: 'terminate',
        });
      }
    }, interval * 1000);

    this.heartbeatIntervals.set(examKey, heartbeatInterval);
  }

  /**
   * Start screenshot monitoring
   */
  private startScreenshotMonitoring(examKey: string, interval: number): void {
    const screenshotInterval = setInterval(() => {
      const config = this.activeExams.get(examKey);
      const status = this.securityStatus.get(examKey);

      if (!config || !status) {
        clearInterval(screenshotInterval);
        return;
      }

      // Record screenshot event
      this.recordEvent({
        examId: config.examId,
        userId: config.userId,
        sessionId: config.sessionId,
        eventType: 'screenshot',
        severity: 'low',
        details: {
          timestamp: Date.now(),
          isFullScreen: status.isFullScreen,
          isBrowserLocked: status.isBrowserLocked,
        },
        action: 'log',
      });
    }, interval * 1000);

    this.screenshotIntervals.set(examKey, screenshotInterval);
  }

  /**
   * Set up event listeners for exam security
   */
  private setupEventListeners(examKey: string, config: ExamSecurityConfig): void {
    if (typeof window === 'undefined') {
      return; // Server-side, skip event listeners
    }

    // Tab switch detection
    if (!config.allowTabSwitch) {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          this.recordEvent({
            examId: config.examId,
            userId: config.userId,
            sessionId: config.sessionId,
            eventType: 'tab_switch',
            severity: 'high',
            details: {
              timestamp: Date.now(),
              reason: 'tab_switch',
            },
            action: 'warn',
          });
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Window blur detection
    const handleWindowBlur = () => {
      this.recordEvent({
        examId: config.examId,
        userId: config.userId,
        sessionId: config.sessionId,
        eventType: 'window_blur',
        severity: 'medium',
        details: {
          timestamp: Date.now(),
          reason: 'window_blur',
        },
        action: 'log',
      });
    };

    window.addEventListener('blur', handleWindowBlur);

    // Fullscreen exit detection
    if (config.requireFullScreen) {
      const handleFullscreenChange = () => {
        if (!document.fullscreenElement) {
          this.recordEvent({
            examId: config.examId,
            userId: config.userId,
            sessionId: config.sessionId,
            eventType: 'fullscreen_exit',
            severity: 'high',
            details: {
              timestamp: Date.now(),
              reason: 'fullscreen_exit',
            },
            action: 'warn',
          });
        }
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
    }

    // Copy/paste detection
    if (!config.enableCopyPaste) {
      const handleCopy = (e: ClipboardEvent) => {
        e.preventDefault();
        this.recordEvent({
          examId: config.examId,
          userId: config.userId,
          sessionId: config.sessionId,
          eventType: 'copy_paste',
          severity: 'medium',
          details: {
            timestamp: Date.now(),
            action: 'copy',
            data: e.clipboardData?.getData('text'),
          },
          action: 'block',
        });
      };

      const handlePaste = (e: ClipboardEvent) => {
        e.preventDefault();
        this.recordEvent({
          examId: config.examId,
          userId: config.userId,
          sessionId: config.sessionId,
          eventType: 'copy_paste',
          severity: 'medium',
          details: {
            timestamp: Date.now(),
            action: 'paste',
            data: e.clipboardData?.getData('text'),
          },
          action: 'block',
        });
      };

      document.addEventListener('copy', handleCopy);
      document.addEventListener('paste', handlePaste);
    }

    // Right-click detection
    if (!config.enableRightClick) {
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        this.recordEvent({
          examId: config.examId,
          userId: config.userId,
          sessionId: config.sessionId,
          eventType: 'right_click',
          severity: 'low',
          details: {
            timestamp: Date.now(),
            x: e.clientX,
            y: e.clientY,
          },
          action: 'block',
        });
      };

      document.addEventListener('contextmenu', handleContextMenu);
    }

    // Dev tools detection
    if (!config.enableDevTools) {
      const handleDevTools = () => {
        this.recordEvent({
          examId: config.examId,
          userId: config.userId,
          sessionId: config.sessionId,
          eventType: 'dev_tools',
          severity: 'high',
          details: {
            timestamp: Date.now(),
            reason: 'dev_tools_opened',
          },
          action: 'warn',
        });
      };

      // Simple dev tools detection
      let devtools = false;
      setInterval(() => {
        if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
          if (!devtools) {
            devtools = true;
            handleDevTools();
          }
        } else {
          devtools = false;
        }
      }, 1000);
    }
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(examKey: string): void {
    // In a real implementation, you would store references to the event listeners
    // and remove them here. For simplicity, we'll just clear the intervals.
    // In production, you'd want to properly clean up all event listeners.
  }

  /**
   * Update security status based on event
   */
  private updateSecurityStatus(
    examKey: string,
    event: ExamSecurityEvent,
    config: ExamSecurityConfig,
    status: ExamSecurityStatus
  ): void {
    switch (event.eventType) {
      case 'tab_switch':
        status.tabSwitches++;
        if (status.tabSwitches > config.maxTabSwitches) {
          status.violations++;
          status.warnings.push(`Exceeded maximum tab switches (${config.maxTabSwitches})`);
        }
        break;

      case 'window_blur':
        status.windowBlurs++;
        if (status.windowBlurs > config.maxWindowBlurs) {
          status.violations++;
          status.warnings.push(`Exceeded maximum window blurs (${config.maxWindowBlurs})`);
        }
        break;

      case 'fullscreen_exit':
        status.isFullScreen = false;
        status.violations++;
        status.warnings.push('Exited fullscreen mode');
        break;

      case 'copy_paste':
      case 'right_click':
      case 'dev_tools':
        status.violations++;
        status.warnings.push(`Security violation: ${event.eventType}`);
        break;

      case 'heartbeat':
        status.lastHeartbeat = event.timestamp;
        break;
    }

    // Update security score
    status.securityScore = this.calculateSecurityScore(status, config);
    
    // Determine if exam can continue
    status.canContinue = status.securityScore > 30 && status.violations < 5;
  }

  /**
   * Handle security event based on severity and action
   */
  private handleSecurityEvent(
    event: ExamSecurityEvent,
    config: ExamSecurityConfig,
    status: ExamSecurityStatus
  ): void {
    switch (event.action) {
      case 'warn':
        // Show warning to user
        this.showWarning(event, status);
        break;

      case 'block':
        // Block the action (already prevented in event listeners)
        break;

      case 'log':
        // Just log the event (already done)
        break;

      case 'terminate':
        // Terminate the exam
        this.terminateExam(config.examId, config.userId, config.sessionId, event);
        break;
    }
  }

  /**
   * Handle tab switch
   */
  private handleTabSwitch(sessionId: string): void {
    const status = this.securityStatus.get(sessionId);
    if (!status) {
      return;
    }

    status.tabSwitches++;

    this.recordEvent({
      examId: status.examId,
      userId: status.userId,
      sessionId: status.sessionId,
      eventType: 'tab_switch',
      severity: 'high',
      details: {
        tabSwitches: status.tabSwitches,
        maxAllowed: this.activeExams.get(sessionId)?.maxTabSwitches || 3,
      },
      action: 'warn',
    });
  }

  /**
   * Handle fullscreen exit
   */
  private handleFullscreenExit(sessionId: string): void {
    const status = this.securityStatus.get(sessionId);
    if (!status) {
      return;
    }

    status.isFullScreen = false;

    this.recordEvent({
      examId: status.examId,
      userId: status.userId,
      sessionId: status.sessionId,
      eventType: 'fullscreen_exit',
      severity: 'high',
      details: {
        reason: 'fullscreen_exit',
      },
      action: 'warn',
    });
  }

  /**
   * Handle copy/paste attempt
   */
  private handleCopyPaste(sessionId: string, action: 'copy' | 'paste', data?: string): void {
    const status = this.securityStatus.get(sessionId);
    if (!status) {
      return;
    }

    this.recordEvent({
      examId: status.examId,
      userId: status.userId,
      sessionId: status.sessionId,
      eventType: 'copy_paste',
      severity: 'medium',
      details: {
        action,
        data: data ? data.substring(0, 100) : undefined, // Limit data length
      },
      action: 'block',
    });
  }

  /**
   * Handle right click
   */
  private handleRightClick(sessionId: string, x: number, y: number): void {
    const status = this.securityStatus.get(sessionId);
    if (!status) {
      return;
    }

    this.recordEvent({
      examId: status.examId,
      userId: status.userId,
      sessionId: status.sessionId,
      eventType: 'right_click',
      severity: 'low',
      details: {
        x,
        y,
      },
      action: 'block',
    });
  }

  /**
   * Show warning to user
   */
  private showWarning(event: ExamSecurityEvent, status: ExamSecurityStatus): void {
    if (typeof window === 'undefined') {
      return; // Server-side, skip UI warnings
    }

    const warningMessages = {
      'tab_switch': 'Warning: You have switched tabs. This is not allowed during the exam.',
      'fullscreen_exit': 'Warning: You must remain in fullscreen mode during the exam.',
      'dev_tools': 'Warning: Developer tools are not allowed during the exam.',
    };

    const message = warningMessages[event.eventType as keyof typeof warningMessages] || 'Security violation detected.';
    
    // In a real implementation, you would show a modal or notification
    console.warn(`[EXAM SECURITY] ${message}`);
    
    // You could also send this to a notification service
    // notificationService.showWarning(message, event.severity);
  }

  /**
   * Terminate exam due to security violation
   */
  private terminateExam(examId: string, userId: string, sessionId: string, event: ExamSecurityEvent): void {
    this.recordEvent({
      examId,
      userId,
      sessionId,
      eventType: 'violation',
      severity: 'critical',
      details: {
        reason: 'exam_terminated',
        terminatingEvent: event.eventType,
        message: 'Exam terminated due to security violation',
      },
      action: 'terminate',
    });

    // Stop security monitoring
    this.stopExamSecurity(examId, userId, sessionId);

    // In a real implementation, you would:
    // 1. Save exam state
    // 2. Notify the user
    // 3. Log the incident
    // 4. Notify administrators
    console.error(`[EXAM SECURITY] Exam ${examId} terminated for user ${userId} due to: ${event.eventType}`);
  }

  /**
   * Calculate security score
   */
  private calculateSecurityScore(status: ExamSecurityStatus, config: ExamSecurityConfig): number {
    let score = 100;

    // Deduct points for violations
    score -= status.violations * 10;

    // Deduct points for tab switches
    if (status.tabSwitches > 0) {
      score -= Math.min(20, status.tabSwitches * 5);
    }

    // Deduct points for window blurs
    if (status.windowBlurs > 0) {
      score -= Math.min(15, status.windowBlurs * 3);
    }

    // Deduct points if not in fullscreen (when required)
    if (config.requireFullScreen && !status.isFullScreen) {
      score -= 25;
    }

    // Deduct points for browser not locked (when required)
    if (config.enableBrowserLock && !status.isBrowserLocked) {
      score -= 20;
    }

    return Math.max(0, score);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return 'exam_event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get all active exams
   */
  getActiveExams(): ExamSecurityConfig[] {
    return Array.from(this.activeExams.values());
  }

  /**
   * Check if exam is active
   */
  isExamActive(examId: string, userId: string, sessionId: string): boolean {
    const examKey = `${examId}_${userId}_${sessionId}`;
    return this.activeExams.has(examKey);
  }

  /**
   * Force fullscreen mode
   */
  async requestFullscreen(): Promise<boolean> {
    if (typeof document === 'undefined') {
      return false;
    }

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        return true;
      }
    } catch (error) {
      console.error('Failed to request fullscreen:', error);
    }

    return false;
  }

  /**
   * Exit fullscreen mode
   */
  async exitFullscreen(): Promise<boolean> {
    if (typeof document === 'undefined') {
      return false;
    }

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return true;
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }

    return false;
  }

  /**
   * Check if currently in fullscreen
   */
  isFullscreen(): boolean {
    if (typeof document === 'undefined') {
      return false;
    }

    return !!document.fullscreenElement;
  }

  /**
   * Clear old exam data
   */
  clearOldData(olderThanDays: number = 7): void {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    // Clear old events
    for (const [key, events] of this.examEvents.entries()) {
      const filteredEvents = events.filter(event => event.timestamp > cutoffTime);
      if (filteredEvents.length === 0) {
        this.examEvents.delete(key);
      } else {
        this.examEvents.set(key, filteredEvents);
      }
    }
  }
}

export const examSecurityService = ExamSecurityService.getInstance();
export default examSecurityService;
