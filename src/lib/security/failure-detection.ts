/**
 * Failure Detection Service
 *
 * Intelligent monitoring system that detects various types of failures
 * during exam sessions and triggers appropriate emergency responses.
 */

import { auditLogger } from './audit-logger';

export interface FailureDetectionConfig {
  enableNetworkMonitoring: boolean;
  enableBrowserMonitoring: boolean;
  enablePerformanceMonitoring: boolean;
  enableSecurityMonitoring: boolean;
  networkTimeoutThreshold: number; // in milliseconds
  browserCrashDetectionDelay: number; // in milliseconds
  performanceThresholds: {
    memoryUsage: number; // percentage
    cpuUsage: number; // percentage
    renderTime: number; // in milliseconds
  };
  securityViolationThreshold: number; // number of violations
  monitoringInterval: number; // in milliseconds
}

export interface DetectedFailure {
  id: string;
  type: 'network_failure' | 'browser_crash' | 'performance_degradation' | 'security_violation' | 'data_corruption' | 'storage_failure' | 'memory_leak' | 'render_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  examId: string;
  userId: string;
  sessionId: string;
  timestamp: number;
  description: string;
  metrics: Record<string, any>;
  recoverySuggestion: string;
  autoRecoverable: boolean;
}

export interface SystemMetrics {
  network: {
    isOnline: boolean;
    rtt: number;
    downlink: number;
    effectiveType: string;
    lastConnectivityCheck: number;
  };
  browser: {
    userAgent: string;
    platform: string;
    cookieEnabled: boolean;
    onLine: boolean;
    lastHeartbeat: number;
  };
  performance: {
    memoryUsage: number;
    cpuUsage: number;
    renderTime: number;
    timestamp: number;
  };
  security: {
    violationCount: number;
    lastViolation: number;
    suspiciousActivity: boolean;
  };
}

export class FailureDetectionService {
  private config: FailureDetectionConfig;
  private systemMetrics: SystemMetrics;
  private monitoringInterval?: NodeJS.Timeout;
  private lastHeartbeat = Date.now();
  private heartbeatInterval?: NodeJS.Timeout;
  private violationCounts = new Map<string, number>();
  private isInitialized = false;

  constructor(config: Partial<FailureDetectionConfig> = {}) {
    this.config = {
      enableNetworkMonitoring: true,
      enableBrowserMonitoring: true,
      enablePerformanceMonitoring: true,
      enableSecurityMonitoring: true,
      networkTimeoutThreshold: 5000, // 5 seconds
      browserCrashDetectionDelay: 30000, // 30 seconds
      performanceThresholds: {
        memoryUsage: 80, // 80%
        cpuUsage: 90, // 90%
        renderTime: 100 // 100ms
      },
      securityViolationThreshold: 5,
      monitoringInterval: 10000, // 10 seconds
      ...config
    };

    this.systemMetrics = this.initializeSystemMetrics();
  }

  /**
   * Initialize the failure detection service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.setupMonitoring();
      this.startHeartbeat();
      this.initializeSystemMetrics();

      this.isInitialized = true;

      auditLogger.logExamSecurity('exam_started', {
        examId: 'system',
        userId: 'system',
        sessionId: 'system',
        severity: 'low',
        description: 'Failure detection service initialized',
        metadata: { config: this.config }
      });
    } catch (error) {
      console.error('Failed to initialize failure detection service:', error);
      throw error;
    }
  }

  /**
   * Start monitoring for a specific exam session
   */
  startMonitoring(examId: string, userId: string, sessionId: string): void {
    const sessionKey = this.getSessionKey(examId, userId, sessionId);
    this.violationCounts.set(sessionKey, 0);

    auditLogger.logExamSecurity('exam_started', {
      examId,
      userId,
      sessionId,
      severity: 'low',
      description: 'Failure monitoring started for session',
      metadata: { sessionKey }
    });
  }

  /**
   * Stop monitoring for a specific exam session
   */
  stopMonitoring(examId: string, userId: string, sessionId: string): void {
    const sessionKey = this.getSessionKey(examId, userId, sessionId);
    this.violationCounts.delete(sessionKey);

    auditLogger.logExamSecurity('exam_completed', {
      examId,
      userId,
      sessionId,
      severity: 'low',
      description: 'Failure monitoring stopped for session',
      metadata: { sessionKey }
    });
  }

  /**
   * Detect failures based on current system state
   */
  async detectFailures(examId: string, userId: string, sessionId: string): Promise<DetectedFailure[]> {
    const failures: DetectedFailure[] = [];

    // Update system metrics
    await this.updateSystemMetrics();

    // Network failure detection
    if (this.config.enableNetworkMonitoring) {
      const networkFailure = this.detectNetworkFailure(examId, userId, sessionId);
      if (networkFailure) failures.push(networkFailure);
    }

    // Browser crash detection
    if (this.config.enableBrowserMonitoring) {
      const browserFailure = this.detectBrowserFailure(examId, userId, sessionId);
      if (browserFailure) failures.push(browserFailure);
    }

    // Performance degradation detection
    if (this.config.enablePerformanceMonitoring) {
      const performanceFailure = this.detectPerformanceFailure(examId, userId, sessionId);
      if (performanceFailure) failures.push(performanceFailure);
    }

    // Security violation detection
    if (this.config.enableSecurityMonitoring) {
      const securityFailure = this.detectSecurityFailure(examId, userId, sessionId);
      if (securityFailure) failures.push(securityFailure);
    }

    return failures;
  }

  /**
   * Report a security violation for monitoring
   */
  reportSecurityViolation(examId: string, userId: string, sessionId: string, violationType: string): void {
    const sessionKey = this.getSessionKey(examId, userId, sessionId);
    const currentCount = this.violationCounts.get(sessionKey) || 0;
    this.violationCounts.set(sessionKey, currentCount + 1);

    // Update metrics
    this.systemMetrics.security.violationCount = currentCount + 1;
    this.systemMetrics.security.lastViolation = Date.now();
    this.systemMetrics.security.suspiciousActivity = currentCount + 1 >= this.config.securityViolationThreshold;
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    return { ...this.systemMetrics };
  }

  /**
   * Get failure statistics
   */
  getFailureStatistics(): {
    totalViolations: number;
    activeSessions: number;
    networkStatus: string;
    performanceStatus: string;
    securityStatus: string;
  } {
    const totalViolations = Array.from(this.violationCounts.values()).reduce((sum, count) => sum + count, 0);

    return {
      totalViolations,
      activeSessions: this.violationCounts.size,
      networkStatus: this.getNetworkStatus(),
      performanceStatus: this.getPerformanceStatus(),
      securityStatus: this.getSecurityStatus()
    };
  }

  /**
   * Detect network failure
   */
  private detectNetworkFailure(examId: string, userId: string, sessionId: string): DetectedFailure | null {
    const timeSinceLastCheck = Date.now() - this.systemMetrics.network.lastConnectivityCheck;

    if (!this.systemMetrics.network.isOnline) {
      return {
        id: this.generateFailureId(),
        type: 'network_failure',
        severity: 'high',
        examId,
        userId,
        sessionId,
        timestamp: Date.now(),
        description: 'Network connection lost',
        metrics: {
          isOnline: this.systemMetrics.network.isOnline,
          timeOffline: timeSinceLastCheck
        },
        recoverySuggestion: 'Check network connection and retry',
        autoRecoverable: true
      };
    }

    if (this.systemMetrics.network.rtt > this.config.networkTimeoutThreshold) {
      return {
        id: this.generateFailureId(),
        type: 'network_failure',
        severity: 'medium',
        examId,
        userId,
        sessionId,
        timestamp: Date.now(),
        description: 'High network latency detected',
        metrics: {
          rtt: this.systemMetrics.network.rtt,
          effectiveType: this.systemMetrics.network.effectiveType
        },
        recoverySuggestion: 'Consider switching to a more stable network',
        autoRecoverable: false
      };
    }

    return null;
  }

  /**
   * Detect browser failure
   */
  private detectBrowserFailure(examId: string, userId: string, sessionId: string): DetectedFailure | null {
    const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;

    if (timeSinceHeartbeat > this.config.browserCrashDetectionDelay) {
      return {
        id: this.generateFailureId(),
        type: 'browser_crash',
        severity: 'critical',
        examId,
        userId,
        sessionId,
        timestamp: Date.now(),
        description: 'Browser heartbeat lost - possible crash',
        metrics: {
          timeSinceHeartbeat,
          lastHeartbeat: this.lastHeartbeat
        },
        recoverySuggestion: 'Refresh browser and resume exam',
        autoRecoverable: false
      };
    }

    return null;
  }

  /**
   * Detect performance failure
   */
  private detectPerformanceFailure(examId: string, userId: string, sessionId: string): DetectedFailure | null {
    const metrics = this.systemMetrics.performance;

    if (metrics.memoryUsage > this.config.performanceThresholds.memoryUsage) {
      return {
        id: this.generateFailureId(),
        type: 'memory_leak',
        severity: 'high',
        examId,
        userId,
        sessionId,
        timestamp: Date.now(),
        description: 'High memory usage detected',
        metrics: {
          memoryUsage: metrics.memoryUsage,
          threshold: this.config.performanceThresholds.memoryUsage
        },
        recoverySuggestion: 'Refresh browser to clear memory',
        autoRecoverable: false
      };
    }

    if (metrics.renderTime > this.config.performanceThresholds.renderTime) {
      return {
        id: this.generateFailureId(),
        type: 'render_failure',
        severity: 'medium',
        examId,
        userId,
        sessionId,
        timestamp: Date.now(),
        description: 'Slow rendering performance detected',
        metrics: {
          renderTime: metrics.renderTime,
          threshold: this.config.performanceThresholds.renderTime
        },
        recoverySuggestion: 'Close unnecessary tabs and applications',
        autoRecoverable: false
      };
    }

    if (metrics.cpuUsage > this.config.performanceThresholds.cpuUsage) {
      return {
        id: this.generateFailureId(),
        type: 'performance_degradation',
        severity: 'medium',
        examId,
        userId,
        sessionId,
        timestamp: Date.now(),
        description: 'High CPU usage detected',
        metrics: {
          cpuUsage: metrics.cpuUsage,
          threshold: this.config.performanceThresholds.cpuUsage
        },
        recoverySuggestion: 'Close unnecessary applications',
        autoRecoverable: false
      };
    }

    return null;
  }

  /**
   * Detect security failure
   */
  private detectSecurityFailure(examId: string, userId: string, sessionId: string): DetectedFailure | null {
    const sessionKey = this.getSessionKey(examId, userId, sessionId);
    const violationCount = this.violationCounts.get(sessionKey) || 0;

    if (violationCount >= this.config.securityViolationThreshold) {
      return {
        id: this.generateFailureId(),
        type: 'security_violation',
        severity: 'high',
        examId,
        userId,
        sessionId,
        timestamp: Date.now(),
        description: 'Multiple security violations detected',
        metrics: {
          violationCount,
          threshold: this.config.securityViolationThreshold,
          lastViolation: this.systemMetrics.security.lastViolation
        },
        recoverySuggestion: 'Exam may need to be terminated',
        autoRecoverable: false
      };
    }

    return null;
  }

  /**
   * Set up monitoring intervals
   */
  private setupMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      // Update system metrics
      await this.updateSystemMetrics();
    }, this.config.monitoringInterval);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.lastHeartbeat = Date.now();
    }, 5000); // 5 second heartbeat
  }

  /**
   * Update system metrics
   */
  private async updateSystemMetrics(): Promise<void> {
    // Update network metrics
    this.systemMetrics.network = {
      isOnline: navigator.onLine,
      rtt: await this.measureNetworkLatency(),
      downlink: (navigator as any).connection?.downlink || 0,
      effectiveType: (navigator as any).connection?.effectiveType || 'unknown',
      lastConnectivityCheck: Date.now()
    };

    // Update browser metrics
    this.systemMetrics.browser = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      lastHeartbeat: this.lastHeartbeat
    };

    // Update performance metrics
    this.systemMetrics.performance = {
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: 0, // Would need additional libraries to measure
      renderTime: await this.measureRenderTime(),
      timestamp: Date.now()
    };
  }

  /**
   * Measure network latency
   */
  private async measureNetworkLatency(): Promise<number> {
    const startTime = Date.now();

    try {
      // Simple ping to measure latency
      const response = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000)
      });

      return Date.now() - startTime;
    } catch (error) {
      return 9999; // High latency if failed
    }
  }

  /**
   * Measure render time
   */
  private async measureRenderTime(): Promise<number> {
    return new Promise((resolve) => {
      const startTime = performance.now();

      // Force a reflow/repaint to measure
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const renderTime = performance.now() - startTime;
          resolve(renderTime);
        });
      });
    });
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    const memory = (performance as any).memory;
    if (!memory) return 0;

    return (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
  }

  /**
   * Initialize system metrics
   */
  private initializeSystemMetrics(): SystemMetrics {
    return {
      network: {
        isOnline: navigator.onLine,
        rtt: 0,
        downlink: 0,
        effectiveType: 'unknown',
        lastConnectivityCheck: Date.now()
      },
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        lastHeartbeat: Date.now()
      },
      performance: {
        memoryUsage: 0,
        cpuUsage: 0,
        renderTime: 0,
        timestamp: Date.now()
      },
      security: {
        violationCount: 0,
        lastViolation: 0,
        suspiciousActivity: false
      }
    };
  }

  /**
   * Get network status string
   */
  private getNetworkStatus(): string {
    if (!this.systemMetrics.network.isOnline) return 'offline';
    if (this.systemMetrics.network.rtt > this.config.networkTimeoutThreshold) return 'slow';
    return 'good';
  }

  /**
   * Get performance status string
   */
  private getPerformanceStatus(): string {
    const metrics = this.systemMetrics.performance;
    if (metrics.memoryUsage > this.config.performanceThresholds.memoryUsage) return 'critical';
    if (metrics.renderTime > this.config.performanceThresholds.renderTime) return 'slow';
    return 'good';
  }

  /**
   * Get security status string
   */
  private getSecurityStatus(): string {
    if (this.systemMetrics.security.suspiciousActivity) return 'suspicious';
    return 'normal';
  }

  /**
   * Get session key
   */
  private getSessionKey(examId: string, userId: string, sessionId: string): string {
    return `${examId}_${userId}_${sessionId}`;
  }

  /**
   * Generate failure ID
   */
  private generateFailureId(): string {
    return `failure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Destroy the service and clean up resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.violationCounts.clear();
  }
}

// Export singleton instance
export const failureDetectionService = new FailureDetectionService();
