/**
 * Comprehensive Audit Logging System
 * 
 * This module provides comprehensive audit logging for all authentication
 * events and security violations with structured logging and analysis.
 */

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'critical';
  category: 'authentication' | 'authorization' | 'security' | 'system' | 'user_action' | 'exam_security';
  event: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  collegeId?: string;
  role?: string;
  details: Record<string, any>;
  metadata: {
    source: string;
    version: string;
    environment: string;
    requestId?: string;
    traceId?: string;
  };
}

export interface SecurityViolation {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'authentication_failure' | 'unauthorized_access' | 'suspicious_activity' | 'data_breach' | 'system_compromise';
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  description: string;
  details: Record<string, any>;
  actions: string[];
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface AuditReport {
  id: string;
  title: string;
  type: 'security_summary' | 'user_activity' | 'system_health' | 'compliance';
  period: {
    start: number;
    end: number;
  };
  summary: {
    totalEvents: number;
    criticalEvents: number;
    securityViolations: number;
    uniqueUsers: number;
    uniqueIPs: number;
  };
  findings: {
    category: string;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }[];
  recommendations: string[];
  generatedAt: number;
  generatedBy: string;
}

class AuditLoggerService {
  private static instance: AuditLoggerService;
  private logs: AuditLogEntry[] = [];
  private violations: SecurityViolation[] = [];
  private config = {
    maxLogs: 10000,
    maxViolations: 1000,
    retentionDays: 90,
    enableRealTimeAlerts: true,
    alertThresholds: {
      critical: 1,
      high: 5,
      medium: 20,
      low: 50,
    },
  };

  static getInstance(): AuditLoggerService {
    if (!AuditLoggerService.instance) {
      AuditLoggerService.instance = new AuditLoggerService();
    }
    return AuditLoggerService.instance;
  }

  /**
   * Log an audit event
   */
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'metadata'>): void {
    const auditEntry: AuditLogEntry = {
      ...entry,
      id: this.generateLogId(),
      timestamp: Date.now(),
      metadata: {
        source: 'exam-saas',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        requestId: this.generateRequestId(),
        traceId: this.generateTraceId(),
      },
    };

    this.logs.push(auditEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(-this.config.maxLogs);
    }

    // Check for security violations
    this.checkForSecurityViolations(auditEntry);

    // Send real-time alerts if enabled
    if (this.config.enableRealTimeAlerts) {
      this.checkForRealTimeAlerts(auditEntry);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUDIT] ${auditEntry.level.toUpperCase()}: ${auditEntry.event}`, auditEntry);
    }
  }

  /**
   * Log authentication event
   */
  logAuthentication(
    event: 'login_success' | 'login_failure' | 'logout' | 'password_reset' | 'account_locked' | 'session_expired',
    details: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      collegeId?: string;
      role?: string;
      email?: string;
      reason?: string;
      attempts?: number;
    }
  ): void {
    this.log({
      level: event.includes('failure') || event.includes('locked') ? 'warn' : 'info',
      category: 'authentication',
      event,
      userId: details.userId,
      sessionId: details.sessionId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      collegeId: details.collegeId,
      role: details.role,
      details: {
        email: details.email,
        reason: details.reason,
        attempts: details.attempts,
      },
    });
  }

  /**
   * Log authorization event
   */
  logAuthorization(
    event: 'access_granted' | 'access_denied' | 'permission_changed' | 'role_assigned' | 'role_revoked',
    details: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      resource?: string;
      action?: string;
      role?: string;
      collegeId?: string;
      reason?: string;
    }
  ): void {
    this.log({
      level: event.includes('denied') ? 'warn' : 'info',
      category: 'authorization',
      event,
      userId: details.userId,
      sessionId: details.sessionId,
      ipAddress: details.ipAddress,
      collegeId: details.collegeId,
      role: details.role,
      details: {
        resource: details.resource,
        action: details.action,
        reason: details.reason,
      },
    });
  }

  /**
   * Log security event
   */
  logSecurity(
    event: 'suspicious_activity' | 'brute_force_attempt' | 'vpn_detected' | 'proxy_detected' | 'tor_detected' | 'device_mismatch' | 'location_change',
    details: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      collegeId?: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      metadata?: Record<string, any>;
    }
  ): void {
    this.log({
      level: details.severity === 'critical' ? 'critical' : details.severity === 'high' ? 'error' : 'warn',
      category: 'security',
      event,
      userId: details.userId,
      sessionId: details.sessionId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      collegeId: details.collegeId,
      details: {
        severity: details.severity,
        description: details.description,
        ...details.metadata,
      },
    });
  }

  /**
   * Log exam security event
   */
  logExamSecurity(
    event: 'exam_started' | 'exam_completed' | 'exam_terminated' | 'tab_switch' | 'fullscreen_exit' | 'copy_paste' | 'right_click' | 'dev_tools',
    details: {
      examId: string;
      userId: string;
      sessionId: string;
      ipAddress?: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      metadata?: Record<string, any>;
    }
  ): void {
    this.log({
      level: details.severity === 'critical' ? 'critical' : details.severity === 'high' ? 'error' : 'warn',
      category: 'exam_security',
      event,
      userId: details.userId,
      sessionId: details.sessionId,
      ipAddress: details.ipAddress,
      details: {
        examId: details.examId,
        severity: details.severity,
        description: details.description,
        ...details.metadata,
      },
    });
  }

  /**
   * Log user action
   */
  logUserAction(
    event: string,
    details: {
      userId: string;
      sessionId?: string;
      ipAddress?: string;
      collegeId?: string;
      role?: string;
      resource?: string;
      action?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    this.log({
      level: 'info',
      category: 'user_action',
      event,
      userId: details.userId,
      sessionId: details.sessionId,
      ipAddress: details.ipAddress,
      collegeId: details.collegeId,
      role: details.role,
      details: {
        resource: details.resource,
        action: details.action,
        ...details.metadata,
      },
    });
  }

  /**
   * Log system event
   */
  logSystem(
    event: 'startup' | 'shutdown' | 'error' | 'maintenance' | 'backup' | 'update',
    details: {
      level: 'info' | 'warn' | 'error' | 'critical';
      description: string;
      metadata?: Record<string, any>;
    }
  ): void {
    this.log({
      level: details.level,
      category: 'system',
      event,
      details: {
        description: details.description,
        ...details.metadata,
      },
    });
  }

  /**
   * Check for security violations
   */
  private checkForSecurityViolations(entry: AuditLogEntry): void {
    let violation: SecurityViolation | null = null;

    // Check for authentication failures
    if (entry.category === 'authentication' && entry.event === 'login_failure') {
      const recentFailures = this.logs.filter(log => 
        log.category === 'authentication' && 
        log.event === 'login_failure' && 
        log.userId === entry.userId &&
        log.timestamp > Date.now() - (15 * 60 * 1000) // Last 15 minutes
      );

      if (recentFailures.length >= 5) {
        violation = {
          id: this.generateViolationId(),
          timestamp: Date.now(),
          severity: 'high',
          type: 'authentication_failure',
          userId: entry.userId,
          sessionId: entry.sessionId,
          ipAddress: entry.ipAddress,
          description: `Multiple failed login attempts detected (${recentFailures.length} attempts)`,
          details: {
            attempts: recentFailures.length,
            timeWindow: '15 minutes',
            ipAddress: entry.ipAddress,
          },
          actions: ['account_locked', 'ip_blocked'],
          resolved: false,
        };
      }
    }

    // Check for suspicious activity
    if (entry.category === 'security' && entry.level === 'critical') {
      violation = {
        id: this.generateViolationId(),
        timestamp: Date.now(),
        severity: 'critical',
        type: 'suspicious_activity',
        userId: entry.userId,
        sessionId: entry.sessionId,
        ipAddress: entry.ipAddress,
        description: entry.details.description || 'Critical security event detected',
        details: entry.details,
        actions: ['investigate', 'notify_admin'],
        resolved: false,
      };
    }

    // Check for unauthorized access
    if (entry.category === 'authorization' && entry.event === 'access_denied') {
      const recentDenials = this.logs.filter(log => 
        log.category === 'authorization' && 
        log.event === 'access_denied' && 
        log.userId === entry.userId &&
        log.timestamp > Date.now() - (60 * 60 * 1000) // Last hour
      );

      if (recentDenials.length >= 10) {
        violation = {
          id: this.generateViolationId(),
          timestamp: Date.now(),
          severity: 'medium',
          type: 'unauthorized_access',
          userId: entry.userId,
          sessionId: entry.sessionId,
          ipAddress: entry.ipAddress,
          description: `Multiple unauthorized access attempts detected (${recentDenials.length} attempts)`,
          details: {
            attempts: recentDenials.length,
            timeWindow: '1 hour',
            ipAddress: entry.ipAddress,
          },
          actions: ['investigate', 'review_permissions'],
          resolved: false,
        };
      }
    }

    if (violation) {
      this.violations.push(violation);

      // Keep only the most recent violations
      if (this.violations.length > this.config.maxViolations) {
        this.violations = this.violations.slice(-this.config.maxViolations);
      }

      // Log the violation
      this.log({
        level: 'critical',
        category: 'security',
        event: 'security_violation_detected',
        userId: violation.userId,
        sessionId: violation.sessionId,
        ipAddress: violation.ipAddress,
        details: {
          violationId: violation.id,
          type: violation.type,
          severity: violation.severity,
          description: violation.description,
        },
      });
    }
  }

  /**
   * Check for real-time alerts
   */
  private checkForRealTimeAlerts(entry: AuditLogEntry): void {
    const thresholds = this.config.alertThresholds;
    let shouldAlert = false;

    switch (entry.level) {
      case 'critical':
        shouldAlert = true;
        break;
      case 'error':
        const recentErrors = this.logs.filter(log => 
          log.level === 'error' && 
          log.timestamp > Date.now() - (60 * 60 * 1000) // Last hour
        );
        shouldAlert = recentErrors.length >= thresholds.high;
        break;
      case 'warn':
        const recentWarnings = this.logs.filter(log => 
          log.level === 'warn' && 
          log.timestamp > Date.now() - (60 * 60 * 1000) // Last hour
        );
        shouldAlert = recentWarnings.length >= thresholds.medium;
        break;
    }

    if (shouldAlert) {
      this.sendRealTimeAlert(entry);
    }
  }

  /**
   * Send real-time alert
   */
  private sendRealTimeAlert(entry: AuditLogEntry): void {
    // In a real implementation, you would send alerts via:
    // - Email notifications
    // - Slack/Discord webhooks
    // - SMS alerts
    // - Push notifications
    // - Webhook to monitoring systems

    console.warn(`[SECURITY ALERT] ${entry.level.toUpperCase()}: ${entry.event}`, {
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      timestamp: new Date(entry.timestamp).toISOString(),
      details: entry.details,
    });
  }

  /**
   * Get audit logs with filtering
   */
  getLogs(filters: {
    category?: string;
    level?: string;
    userId?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  } = {}): AuditLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filters.category);
    }

    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }

    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }

    if (filters.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startTime!);
    }

    if (filters.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endTime!);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (filters.limit) {
      filteredLogs = filteredLogs.slice(0, filters.limit);
    }

    return filteredLogs;
  }

  /**
   * Get security violations
   */
  getViolations(filters: {
    severity?: string;
    type?: string;
    resolved?: boolean;
    userId?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  } = {}): SecurityViolation[] {
    let filteredViolations = [...this.violations];

    if (filters.severity) {
      filteredViolations = filteredViolations.filter(v => v.severity === filters.severity);
    }

    if (filters.type) {
      filteredViolations = filteredViolations.filter(v => v.type === filters.type);
    }

    if (filters.resolved !== undefined) {
      filteredViolations = filteredViolations.filter(v => v.resolved === filters.resolved);
    }

    if (filters.userId) {
      filteredViolations = filteredViolations.filter(v => v.userId === filters.userId);
    }

    if (filters.startTime) {
      filteredViolations = filteredViolations.filter(v => v.timestamp >= filters.startTime!);
    }

    if (filters.endTime) {
      filteredViolations = filteredViolations.filter(v => v.timestamp <= filters.endTime!);
    }

    // Sort by timestamp (newest first)
    filteredViolations.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (filters.limit) {
      filteredViolations = filteredViolations.slice(0, filters.limit);
    }

    return filteredViolations;
  }

  /**
   * Resolve a security violation
   */
  resolveViolation(violationId: string, resolvedBy: string, resolution: string): boolean {
    const violation = this.violations.find(v => v.id === violationId);
    if (!violation) {
      return false;
    }

    violation.resolved = true;
    violation.resolvedAt = Date.now();
    violation.resolvedBy = resolvedBy;

    // Log the resolution
    this.log({
      level: 'info',
      category: 'security',
      event: 'violation_resolved',
      userId: resolvedBy,
      details: {
        violationId,
        resolution,
        resolvedBy,
      },
    });

    return true;
  }

  /**
   * Generate audit report
   */
  generateReport(
    type: AuditReport['type'],
    startTime: number,
    endTime: number,
    generatedBy: string
  ): AuditReport {
    const logs = this.getLogs({ startTime, endTime });
    const violations = this.getViolations({ startTime, endTime });

    const uniqueUsers = new Set(logs.map(log => log.userId).filter(Boolean)).size;
    const uniqueIPs = new Set(logs.map(log => log.ipAddress).filter(Boolean)).size;

    const findings = this.analyzeFindings(logs, violations);
    const recommendations = this.generateRecommendations(findings);

    return {
      id: this.generateReportId(),
      title: `${type.replace('_', ' ').toUpperCase()} Report`,
      type,
      period: { start: startTime, end: endTime },
      summary: {
        totalEvents: logs.length,
        criticalEvents: logs.filter(log => log.level === 'critical').length,
        securityViolations: violations.length,
        uniqueUsers,
        uniqueIPs,
      },
      findings,
      recommendations,
      generatedAt: Date.now(),
      generatedBy,
    };
  }

  /**
   * Analyze findings from logs and violations
   */
  private analyzeFindings(logs: AuditLogEntry[], violations: SecurityViolation[]): AuditReport['findings'] {
    const findings: AuditReport['findings'] = [];

    // Analyze by category
    const categories = [...new Set(logs.map(log => log.category))];
    for (const category of categories) {
      const categoryLogs = logs.filter(log => log.category === category);
      const criticalCount = categoryLogs.filter(log => log.level === 'critical').length;
      const errorCount = categoryLogs.filter(log => log.level === 'error').length;

      if (criticalCount > 0 || errorCount > 5) {
        findings.push({
          category,
          count: categoryLogs.length,
          severity: criticalCount > 0 ? 'critical' : 'high',
          description: `${criticalCount} critical and ${errorCount} error events in ${category}`,
        });
      }
    }

    // Analyze violations
    const violationTypes = [...new Set(violations.map(v => v.type))];
    for (const type of violationTypes) {
      const typeViolations = violations.filter(v => v.type === type);
      const unresolved = typeViolations.filter(v => !v.resolved).length;

      if (unresolved > 0) {
        findings.push({
          category: 'security_violations',
          count: unresolved,
          severity: typeViolations.some(v => v.severity === 'critical') ? 'critical' : 'high',
          description: `${unresolved} unresolved ${type} violations`,
        });
      }
    }

    return findings;
  }

  /**
   * Generate recommendations based on findings
   */
  private generateRecommendations(findings: AuditReport['findings']): string[] {
    const recommendations: string[] = [];

    for (const finding of findings) {
      switch (finding.category) {
        case 'authentication':
          recommendations.push('Review authentication logs and consider implementing additional security measures');
          break;
        case 'authorization':
          recommendations.push('Audit user permissions and access controls');
          break;
        case 'security':
          recommendations.push('Investigate security events and update security policies');
          break;
        case 'exam_security':
          recommendations.push('Review exam security measures and anti-cheating policies');
          break;
        case 'security_violations':
          recommendations.push('Address unresolved security violations immediately');
          break;
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Clear old data
   */
  clearOldData(): void {
    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    
    this.logs = this.logs.filter(log => log.timestamp > cutoffTime);
    this.violations = this.violations.filter(violation => violation.timestamp > cutoffTime);
  }

  /**
   * Generate unique IDs
   */
  private generateLogId(): string {
    return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateViolationId(): string {
    return 'violation_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateReportId(): string {
    return 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateRequestId(): string {
    return 'req_' + Math.random().toString(36).substr(2, 9);
  }

  private generateTraceId(): string {
    return 'trace_' + Math.random().toString(36).substr(2, 9);
  }
}

export const auditLogger = AuditLoggerService.getInstance();
export default auditLogger;

// Export the AuditLogger class for use in other modules
export class AuditLogger {
  private service: AuditLoggerService;

  constructor(prisma: any) {
    this.service = AuditLoggerService.getInstance();
  }

  async logEvent(event: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    details: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    this.service.log({
      level: 'info',
      category: 'user_action',
      event: event.action,
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: {
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        ...event.details,
      },
    });
  }
}
