/**
 * Main Security Service
 * 
 * This module integrates all security components and provides a unified
 * interface for security operations across the application.
 */

import { fingerprintService, DeviceInfo, BrowserFingerprint } from './fingerprint';
import { ipTrackingService, IPInfo, GeolocationSecurity, SecurityAlert } from './ip-tracking';
import { sessionAnomalyService, SessionEvent, AnomalyPattern, SessionAnalysis } from './session-anomaly';
import { examSecurityService, ExamSecurityConfig, ExamSecurityEvent, ExamSecurityStatus } from './exam-security';
import { auditLogger, AuditLogEntry, SecurityViolation } from './audit-logger';
import { rateLimiter, RateLimitConfig, BruteForceProtection } from './rate-limiter';
import { sessionTimeoutService, SessionTimeoutConfig, SessionTimeoutStatus } from './session-timeout';

export interface SecurityContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  collegeId?: string;
  role?: string;
  examId?: string;
  isExam?: boolean;
}

export interface SecurityAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  factors: {
    device: {
      risk: 'low' | 'medium' | 'high' | 'critical';
      score: number;
      details: string[];
    };
    location: {
      risk: 'low' | 'medium' | 'high' | 'critical';
      score: number;
      details: string[];
    };
    behavior: {
      risk: 'low' | 'medium' | 'high' | 'critical';
      score: number;
      details: string[];
    };
    session: {
      risk: 'low' | 'medium' | 'high' | 'critical';
      score: number;
      details: string[];
    };
  };
  recommendations: string[];
  actions: string[];
  timestamp: number;
}

export interface SecurityResponse {
  allowed: boolean;
  reason?: string;
  assessment?: SecurityAssessment;
  actions?: string[];
  metadata?: Record<string, any>;
}

class SecurityService {
  private static instance: SecurityService;
  private securityCache: Map<string, SecurityAssessment> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Perform comprehensive security assessment
   */
  async assessSecurity(context: SecurityContext): Promise<SecurityAssessment> {
    const cacheKey = this.generateCacheKey(context);
    const cached = this.securityCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached;
    }

    const assessment: SecurityAssessment = {
      overallRisk: 'low',
      riskScore: 0,
      factors: {
        device: { risk: 'low', score: 0, details: [] },
        location: { risk: 'low', score: 0, details: [] },
        behavior: { risk: 'low', score: 0, details: [] },
        session: { risk: 'low', score: 0, details: [] },
      },
      recommendations: [],
      actions: [],
      timestamp: Date.now(),
    };

    try {
      // Device assessment
      if (context.userId && context.sessionId) {
        assessment.factors.device = await this.assessDeviceSecurity(context);
      }

      // Location assessment
      if (context.ipAddress) {
        assessment.factors.location = await this.assessLocationSecurity(context);
      }

      // Behavior assessment
      if (context.userId && context.sessionId) {
        assessment.factors.behavior = await this.assessBehaviorSecurity(context);
      }

      // Session assessment
      if (context.sessionId) {
        assessment.factors.session = await this.assessSessionSecurity(context);
      }

      // Calculate overall risk
      assessment.riskScore = this.calculateOverallRiskScore(assessment.factors);
      assessment.overallRisk = this.determineOverallRisk(assessment.riskScore);

      // Generate recommendations and actions
      assessment.recommendations = this.generateRecommendations(assessment);
      assessment.actions = this.generateActions(assessment);

      // Cache the assessment
      this.securityCache.set(cacheKey, assessment);

      // Log the assessment
      auditLogger.logSecurity('security_assessment', {
        userId: context.userId,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        collegeId: context.collegeId,
        severity: assessment.overallRisk,
        description: `Security assessment completed with ${assessment.overallRisk} risk level`,
        metadata: {
          riskScore: assessment.riskScore,
          factors: assessment.factors,
        },
      });

    } catch (error) {
      console.error('Security assessment failed:', error);
      assessment.overallRisk = 'high';
      assessment.riskScore = 80;
      assessment.factors.device.details.push('Assessment failed');
    }

    return assessment;
  }

  /**
   * Validate authentication request
   */
  async validateAuthentication(
    context: SecurityContext,
    credentials: { email?: string; rollNo?: string; password: string }
  ): Promise<SecurityResponse> {
    const assessment = await this.assessSecurity(context);

    // Check rate limiting
    const rateLimitKey = context.ipAddress ? `ip:${context.ipAddress}` : 'global';
    const rateLimitResult = rateLimiter.checkRateLimit(rateLimitKey, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10, // 10 login attempts per 15 minutes
    });

    if (!rateLimitResult.allowed) {
      auditLogger.logAuthentication('login_failure', {
        userId: context.userId,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        collegeId: context.collegeId,
        reason: 'rate_limit_exceeded',
        attempts: rateLimitResult.remaining,
      });

      return {
        allowed: false,
        reason: 'Too many login attempts. Please try again later.',
        actions: ['rate_limited'],
        metadata: {
          retryAfter: rateLimitResult.retryAfter,
          remaining: rateLimitResult.remaining,
        },
      };
    }

    // Check brute force protection
    const bruteForceKey = context.ipAddress || credentials.email || credentials.rollNo || 'unknown';
    const bruteForceResult = rateLimiter.checkBruteForce(bruteForceKey);

    if (!bruteForceResult.allowed) {
      auditLogger.logAuthentication('login_failure', {
        userId: context.userId,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        collegeId: context.collegeId,
        reason: 'brute_force_protection',
        attempts: bruteForceResult.attempts,
      });

      return {
        allowed: false,
        reason: 'Account temporarily locked due to suspicious activity.',
        actions: ['brute_force_blocked'],
        metadata: {
          blockUntil: bruteForceResult.blockUntil,
          attempts: bruteForceResult.attempts,
        },
      };
    }

    // Check security assessment
    if (assessment.overallRisk === 'critical') {
      auditLogger.logSecurity('authentication_blocked', {
        userId: context.userId,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        collegeId: context.collegeId,
        severity: 'critical',
        description: 'Authentication blocked due to critical security risk',
        metadata: { assessment },
      });

      return {
        allowed: false,
        reason: 'Authentication blocked due to security concerns.',
        assessment,
        actions: ['security_blocked'],
      };
    }

    return {
      allowed: true,
      assessment,
      actions: assessment.actions,
    };
  }

  /**
   * Start exam security monitoring
   */
  async startExamSecurity(
    examId: string,
    userId: string,
    sessionId: string,
    config: Partial<ExamSecurityConfig> = {}
  ): Promise<ExamSecurityStatus | null> {
    const defaultConfig: ExamSecurityConfig = {
      examId,
      userId,
      sessionId,
      startTime: Date.now(),
      endTime: Date.now() + (2 * 60 * 60 * 1000), // 2 hours default
      duration: 120, // 2 hours
      allowTabSwitch: false,
      requireFullScreen: true,
      enableBrowserLock: true,
      enableCopyPaste: false,
      enableRightClick: false,
      enableDevTools: false,
      maxTabSwitches: 3,
      maxWindowBlurs: 5,
      screenshotInterval: 30,
      heartbeatInterval: 10,
      enableScreenRecordingDetection: false,
      enableNetworkMonitoring: false,
      enableAdvancedClipboardMonitoring: false,
      enableAdvancedAntiDebugging: false,
      enableBehaviorAnalysis: false,
      enableTimeBasedAnalysis: false,
      behaviorAnalysisInterval: 60,
      anomalyThreshold: 70,
      enablePatternRecognition: false,
      maxCoordinatedAttempts: 0,
      enableSecureCommunication: false,
      maxClipboardOperations: 0,
      maxNetworkRequests: 0,
      allowedDomains: [],
      enableMouseTracking: false,
      enableKeystrokeAnalysis: false,
      enableGazeTracking: false,
      ...config,
    };

    examSecurityService.startExamSecurity(defaultConfig);

    // Log exam start
    auditLogger.logExamSecurity('exam_started', {
      examId,
      userId,
      sessionId,
      severity: 'low',
      description: 'Exam security monitoring started',
      metadata: { config: defaultConfig },
    });

    return examSecurityService.getSecurityStatus(examId, userId, sessionId);
  }

  /**
   * Start session timeout monitoring
   */
  startSessionTimeout(
    sessionId: string,
    userId: string,
    role: string,
    isExam: boolean = false
  ): SessionTimeoutStatus {
    const status = sessionTimeoutService.startSession(sessionId, userId, role, isExam);

    // Log session start (conform to audit logger typing)
    auditLogger.logAuthentication('session_started', {
      userId,
      sessionId,
      role,
      ipAddress: undefined,
      userAgent: undefined,
      collegeId: undefined,
      reason: undefined,
      attempts: undefined,
    });

    return status;
  }

  /**
   * Record session activity
   */
  recordActivity(context: SecurityContext): void {
    if (!context.userId || !context.sessionId) {
      return;
    }

    // Update session timeout
    sessionTimeoutService.updateActivity(context.sessionId);

    // Record session event
    const event: SessionEvent = {
      id: this.generateEventId(),
      userId: context.userId,
      sessionId: context.sessionId,
      eventType: 'page_view',
      timestamp: Date.now(),
      ipAddress: context.ipAddress || '',
      userAgent: context.userAgent || '',
      metadata: {
        collegeId: context.collegeId,
        role: context.role,
        examId: context.examId,
      },
    };

    sessionAnomalyService.recordEvent(event);

    // Log user action
    auditLogger.logUserAction('page_view', {
      userId: context.userId,
      sessionId: context.sessionId,
      ipAddress: context.ipAddress,
      collegeId: context.collegeId,
      role: context.role,
      metadata: {
        examId: context.examId,
        isExam: context.isExam,
      },
    });
  }

  /**
   * Get security status for a session
   */
  getSecurityStatus(sessionId: string): {
    sessionTimeout: SessionTimeoutStatus | null;
    examSecurity: ExamSecurityStatus | null;
    anomalies: SessionAnalysis | null;
  } {
    return {
      sessionTimeout: sessionTimeoutService.getSessionStatus(sessionId),
      examSecurity: null, // Would need examId to get this
      anomalies: null, // Would need userId to get this
    };
  }

  /**
   * Get security alerts
   */
  getSecurityAlerts(userId?: string, limit: number = 50): SecurityAlert[] {
    return ipTrackingService.getSecurityAlerts(userId, limit);
  }

  /**
   * Get audit logs
   */
  getAuditLogs(filters: {
    category?: string;
    level?: string;
    userId?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  } = {}): AuditLogEntry[] {
    return auditLogger.getLogs(filters);
  }

  /**
   * Get security violations
   */
  getSecurityViolations(filters: {
    severity?: string;
    type?: string;
    resolved?: boolean;
    userId?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  } = {}): SecurityViolation[] {
    return auditLogger.getViolations(filters);
  }

  /**
   * Generate security report
   */
  generateSecurityReport(
    startTime: number,
    endTime: number,
    generatedBy: string
  ): any {
    return auditLogger.generateReport('security_summary', startTime, endTime, generatedBy);
  }

  /**
   * Assess device security
   */
  private async assessDeviceSecurity(context: SecurityContext): Promise<{
    risk: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    details: string[];
  }> {
    const details: string[] = [];
    let score = 0;

    try {
      // In server environments, avoid accessing browser APIs
      const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

      if (isBrowser) {
        // Get detailed device fingerprint in the browser
        const deviceInfo = await fingerprintService.getDeviceInfo();
      
        // Basic device checks
        if (deviceInfo.isMobile) {
          details.push('Mobile device detected');
          score += 10; // Slightly higher risk for mobile
        }

        if (deviceInfo.browserName === 'Unknown') {
          details.push('Unknown browser detected');
          score += 20;
        }

        // Check for suspicious browser characteristics
        if (deviceInfo.fingerprint.webRTC === false) {
          details.push('WebRTC disabled (potential privacy mode)');
          score += 15;
        }

        if (deviceInfo.fingerprint.doNotTrack === '1') {
          details.push('Do Not Track enabled');
          score += 5;
        }
      } else {
        // Server-side: derive limited device info from user agent only
        const ua = context.userAgent || '';
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        if (isMobileUA) {
          details.push('Mobile device (UA)');
          score += 10;
        }

        let browserName = 'Unknown';
        if (ua.includes('Chrome')) browserName = 'Chrome';
        else if (ua.includes('Firefox')) browserName = 'Firefox';
        else if (ua.includes('Safari')) browserName = 'Safari';
        else if (ua.includes('Edge')) browserName = 'Edge';
        if (browserName === 'Unknown') {
          details.push('Unknown browser (UA)');
          score += 10;
        }
      }

    } catch (error) {
      details.push('Device fingerprinting failed');
      score += 30;
    }

    return {
      risk: this.determineRiskLevel(score),
      score,
      details,
    };
  }

  /**
   * Assess location security
   */
  private async assessLocationSecurity(context: SecurityContext): Promise<{
    risk: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    details: string[];
  }> {
    const details: string[] = [];
    let score = 0;

    try {
      const ipInfo = await ipTrackingService.getCurrentIPInfo();
      
      if (ipInfo.isVpn) {
        details.push('VPN connection detected');
        score += 30;
      }

      if (ipInfo.isProxy) {
        details.push('Proxy connection detected');
        score += 25;
      }

      if (ipInfo.isTor) {
        details.push('Tor network detected');
        score += 40;
      }

      if (ipInfo.riskScore > 50) {
        details.push(`High-risk IP address (score: ${ipInfo.riskScore})`);
        score += 20;
      }

      // Check for location changes
      if (context.userId) {
        const geolocationSecurity = await ipTrackingService.trackLocationChange(
          context.userId,
          context.sessionId || 'unknown'
        );

        if (!geolocationSecurity.isLocationConsistent) {
          details.push('Inconsistent location detected');
          score += 25;
        }

        if (geolocationSecurity.securityFlags.length > 0) {
          details.push(`Security flags: ${geolocationSecurity.securityFlags.join(', ')}`);
          score += geolocationSecurity.securityFlags.length * 10;
        }
      }

    } catch (error) {
      details.push('Location assessment failed');
      score += 20;
    }

    return {
      risk: this.determineRiskLevel(score),
      score,
      details,
    };
  }

  /**
   * Assess behavior security
   */
  private async assessBehaviorSecurity(context: SecurityContext): Promise<{
    risk: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    details: string[];
  }> {
    const details: string[] = [];
    let score = 0;

    try {
      if (context.userId && context.sessionId) {
        const analysis = await sessionAnomalyService.analyzeSession(
          context.userId,
          context.sessionId
        );

        if (analysis.isAnomalous) {
          details.push('Anomalous session behavior detected');
          score += analysis.riskScore;
        }

        if (analysis.detectedPatterns.length > 0) {
          const patternTypes = analysis.detectedPatterns.map(p => p.type);
          details.push(`Anomaly patterns: ${patternTypes.join(', ')}`);
          score += analysis.detectedPatterns.length * 15;
        }

        // Check session metrics
        if (analysis.sessionMetrics.uniqueIPs > 2) {
          details.push(`Multiple IP addresses (${analysis.sessionMetrics.uniqueIPs})`);
          score += 20;
        }

        if (analysis.sessionMetrics.uniqueDevices > 1) {
          details.push(`Multiple devices (${analysis.sessionMetrics.uniqueDevices})`);
          score += 25;
        }

        if (analysis.sessionMetrics.locationChanges > 2) {
          details.push(`Multiple location changes (${analysis.sessionMetrics.locationChanges})`);
          score += 30;
        }
      }

    } catch (error) {
      details.push('Behavior assessment failed');
      score += 15;
    }

    return {
      risk: this.determineRiskLevel(score),
      score,
      details,
    };
  }

  /**
   * Assess session security
   */
  private async assessSessionSecurity(context: SecurityContext): Promise<{
    risk: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    details: string[];
  }> {
    const details: string[] = [];
    let score = 0;

    try {
      if (context.sessionId) {
        const sessionStatus = sessionTimeoutService.getSessionStatus(context.sessionId);
        
        if (sessionStatus) {
          if (sessionStatus.isExpired) {
            details.push('Session expired');
            score += 50;
          }

          if (sessionStatus.isIdle) {
            details.push('Session idle');
            score += 10;
          }

          if (sessionStatus.isWarningActive) {
            details.push('Session timeout warning active');
            score += 5;
          }

          if (sessionStatus.extensionsUsed > 0) {
            details.push(`Session extended ${sessionStatus.extensionsUsed} times`);
            score += sessionStatus.extensionsUsed * 5;
          }
        }
      }

    } catch (error) {
      details.push('Session assessment failed');
      score += 10;
    }

    return {
      risk: this.determineRiskLevel(score),
      score,
      details,
    };
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRiskScore(factors: SecurityAssessment['factors']): number {
    const weights = {
      device: 0.2,
      location: 0.3,
      behavior: 0.3,
      session: 0.2,
    };

    return Math.round(
      factors.device.score * weights.device +
      factors.location.score * weights.location +
      factors.behavior.score * weights.behavior +
      factors.session.score * weights.session
    );
  }

  /**
   * Determine overall risk level
   */
  private determineOverallRisk(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(assessment: SecurityAssessment): string[] {
    const recommendations: string[] = [];

    if (assessment.factors.location.risk === 'high' || assessment.factors.location.risk === 'critical') {
      recommendations.push('Verify user location and consider additional authentication');
    }

    if (assessment.factors.device.risk === 'high' || assessment.factors.device.risk === 'critical') {
      recommendations.push('Require device verification or additional security checks');
    }

    if (assessment.factors.behavior.risk === 'high' || assessment.factors.behavior.risk === 'critical') {
      recommendations.push('Monitor user activity and consider session termination');
    }

    if (assessment.factors.session.risk === 'high' || assessment.factors.session.risk === 'critical') {
      recommendations.push('Review session security and timeout policies');
    }

    if (assessment.overallRisk === 'critical') {
      recommendations.push('Immediate security review required');
    }

    return recommendations;
  }

  /**
   * Generate actions
   */
  private generateActions(assessment: SecurityAssessment): string[] {
    const actions: string[] = [];

    if (assessment.overallRisk === 'critical') {
      actions.push('block_access');
      actions.push('notify_admin');
      actions.push('log_incident');
    } else if (assessment.overallRisk === 'high') {
      actions.push('require_additional_auth');
      actions.push('monitor_closely');
    } else if (assessment.overallRisk === 'medium') {
      actions.push('log_event');
      actions.push('monitor');
    } else {
      actions.push('allow_access');
    }

    return actions;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(context: SecurityContext): string {
    return `${context.userId || 'anonymous'}_${context.sessionId || 'no_session'}_${context.ipAddress || 'no_ip'}`;
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Clear security cache
   */
  clearCache(): void {
    this.securityCache.clear();
  }

  /**
   * Get security statistics
   */
  getStatistics(): {
    activeSessions: number;
    securityViolations: number;
    blockedRequests: number;
    totalAssessments: number;
  } {
    return {
      activeSessions: sessionTimeoutService.getActiveSessions().length,
      securityViolations: auditLogger.getViolations().length,
      blockedRequests: rateLimiter.getSecurityMetrics().blockedRequests,
      totalAssessments: this.securityCache.size,
    };
  }
}

export const securityService = SecurityService.getInstance();
export default securityService;
