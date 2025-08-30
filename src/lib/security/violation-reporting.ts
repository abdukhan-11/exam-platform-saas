/**
 * Comprehensive Violation Reporting and Evidence Collection System
 *
 * This module provides a complete violation reporting system that aggregates,
 * analyzes, and reports security violations during exams with evidence collection,
 * severity scoring, trend analysis, and automated report generation.
 */

import { examSecurityService, ExamSecurityEvent, ExamSecurityStatus } from './exam-security';
import { auditLogger, AuditLogEntry } from './audit-logger';

export interface ViolationEvidence {
  id: string;
  violationId: string;
  type: 'screenshot' | 'behavior_data' | 'network_log' | 'clipboard_content' | 'system_info' | 'user_action_log';
  timestamp: number;
  data: any;
  metadata: Record<string, any>;
}

export interface ViolationSeverity {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  penaltyWeight: number; // Multiplier for score impact
  escalationThreshold: number; // Number of violations before escalation
  recommendedActions: string[];
}

export interface ViolationReport {
  id: string;
  examId: string;
  userId: string;
  sessionId: string;
  violationCount: number;
  severityScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  violations: ExamSecurityEvent[];
  evidence: ViolationEvidence[];
  trendAnalysis: {
    violationFrequency: number;
    patternDetection: string[];
    repeatOffenderScore: number;
    coordinatedCheatingIndicators: string[];
  };
  recommendations: string[];
  generatedAt: number;
  generatedBy: string;
}

export interface ViolationTrend {
  userId: string;
  examId?: string;
  violationType: string;
  frequency: number;
  lastOccurrence: number;
  pattern: string;
  riskScore: number;
}

export interface ViolationDashboardData {
  activeExams: {
    examId: string;
    userId: string;
    violationCount: number;
    severityScore: number;
    lastViolation: number;
    status: string;
  }[];
  recentViolations: ExamSecurityEvent[];
  systemHealth: {
    totalActiveExams: number;
    totalViolations: number;
    criticalViolations: number;
    averageSecurityScore: number;
  };
  alerts: {
    id: string;
    type: 'critical_violation' | 'repeat_offender' | 'coordinated_cheating' | 'system_issue';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    examId?: string;
    userId?: string;
    timestamp: number;
  }[];
}

export interface ViolationReportingConfig {
  severityWeights: Record<string, number>; // Event type to weight mapping
  escalationThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  evidenceRetentionDays: number;
  autoReportGeneration: boolean;
  reportGenerationInterval: number; // minutes
  screenshotCaptureEnabled: boolean;
  trendAnalysisEnabled: boolean;
  coordinatedCheatingDetection: boolean;
}

class ViolationReportingService {
  private static instance: ViolationReportingService;
  private config: ViolationReportingConfig;
  private violationReports: Map<string, ViolationReport> = new Map();
  private violationEvidence: Map<string, ViolationEvidence[]> = new Map();
  private violationTrends: Map<string, ViolationTrend[]> = new Map();
  private dashboardData: ViolationDashboardData;
  private reportGenerationInterval: NodeJS.Timeout | null = null;
  private evidenceCleanupInterval: NodeJS.Timeout | null = null;

  private defaultConfig: ViolationReportingConfig = {
    severityWeights: {
      'tab_switch': 15,
      'window_blur': 10,
      'fullscreen_exit': 25,
      'copy_paste': 20,
      'right_click': 5,
      'dev_tools': 30,
      'screenshot': 10,
      'screen_recording': 40,
      'network_violation': 35,
      'clipboard_operation': 15,
      'debug_attempt': 25,
      'secure_comm_breach': 50,
      'mouse_anomaly': 20,
      'keystroke_anomaly': 25,
      'gaze_anomaly': 30,
      'time_pattern_anomaly': 20,
      'behavior_anomaly': 25,
      'coordinated_cheating': 60
    },
    escalationThresholds: {
      low: 10,
      medium: 25,
      high: 50,
      critical: 75
    },
    evidenceRetentionDays: 30,
    autoReportGeneration: true,
    reportGenerationInterval: 30, // 30 minutes
    screenshotCaptureEnabled: true,
    trendAnalysisEnabled: true,
    coordinatedCheatingDetection: true
  };

  static getInstance(): ViolationReportingService {
    if (!ViolationReportingService.instance) {
      ViolationReportingService.instance = new ViolationReportingService();
    }
    return ViolationReportingService.instance;
  }

  constructor() {
    this.config = { ...this.defaultConfig };
    this.dashboardData = {
      activeExams: [],
      recentViolations: [],
      systemHealth: {
        totalActiveExams: 0,
        totalViolations: 0,
        criticalViolations: 0,
        averageSecurityScore: 100
      },
      alerts: []
    };

    this.initializeService();
  }

  /**
   * Initialize the violation reporting service
   */
  private initializeService(): void {
    // Set up event listeners for exam security events
    this.setupEventListeners();

    // Start auto report generation if enabled
    if (this.config.autoReportGeneration) {
      this.startAutoReportGeneration();
    }

    // Start evidence cleanup
    this.startEvidenceCleanup();

    // Initialize dashboard data
    this.updateDashboardData();
  }

  /**
   * Set up event listeners for security violations
   */
  private setupEventListeners(): void {
    // We need to hook into the exam security service events
    // This would require modifying the exam security service to emit events
    // For now, we'll poll the service periodically
    setInterval(() => {
      this.checkForNewViolations();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check for new violations from active exams
   */
  private async checkForNewViolations(): Promise<void> {
    try {
      const activeExams = examSecurityService.getActiveExams();

      for (const exam of activeExams) {
        const events = examSecurityService.getSecurityEvents(
          exam.examId,
          exam.userId,
          exam.sessionId
        );

        // Process new events
        for (const event of events) {
          await this.processViolationEvent(event, exam);
        }
      }

      // Update dashboard data
      this.updateDashboardData();

    } catch (error) {
      console.error('Error checking for new violations:', error);
    }
  }

  /**
   * Process a violation event
   */
  private async processViolationEvent(
    event: ExamSecurityEvent,
    examConfig: any
  ): Promise<void> {
    const violationKey = `${event.examId}_${event.userId}_${event.sessionId}`;

    // Calculate severity
    const severity = this.calculateViolationSeverity(event);

    // Collect evidence
    const evidence = await this.collectViolationEvidence(event, examConfig);

    // Update violation report
    await this.updateViolationReport(violationKey, event, severity, evidence);

    // Update trends
    this.updateViolationTrends(event);

    // Check for escalation
    this.checkEscalationThresholds(violationKey, event, severity);

    // Generate alerts if needed
    this.generateAlerts(event, severity);

    // Log to audit system
    auditLogger.logExamSecurity('tab_switch', {
      examId: event.examId,
      userId: event.userId,
      sessionId: event.sessionId,
      severity: severity.level,
      description: `Security violation detected: ${event.eventType}`,
      metadata: {
        severityScore: severity.score,
        evidenceCount: evidence.length,
        timestamp: event.timestamp
      }
    });
  }

  /**
   * Calculate violation severity based on event type and context
   */
  private calculateViolationSeverity(event: ExamSecurityEvent): ViolationSeverity {
    const baseWeight = this.config.severityWeights[event.eventType] || 10;
    let score = baseWeight;

    // Adjust score based on severity level
    switch (event.severity) {
      case 'low':
        score *= 0.5;
        break;
      case 'medium':
        score *= 1.0;
        break;
      case 'high':
        score *= 1.5;
        break;
      case 'critical':
        score *= 2.0;
        break;
    }

    // Cap at 100
    score = Math.min(100, score);

    // Determine level
    let level: 'low' | 'medium' | 'high' | 'critical';
    if (score >= this.config.escalationThresholds.critical) {
      level = 'critical';
    } else if (score >= this.config.escalationThresholds.high) {
      level = 'high';
    } else if (score >= this.config.escalationThresholds.medium) {
      level = 'medium';
    } else {
      level = 'low';
    }

    // Generate recommended actions
    const recommendedActions = this.generateRecommendedActions(event, level);

    return {
      score,
      level,
      penaltyWeight: this.getPenaltyWeight(level),
      escalationThreshold: this.getEscalationThreshold(level),
      recommendedActions
    };
  }

  /**
   * Collect evidence for a violation
   */
  private async collectViolationEvidence(
    event: ExamSecurityEvent,
    examConfig: any
  ): Promise<ViolationEvidence[]> {
    const evidence: ViolationEvidence[] = [];

    try {
      // Capture screenshot if enabled
      if (this.config.screenshotCaptureEnabled && typeof window !== 'undefined') {
        const screenshot = await this.captureScreenshot();
        if (screenshot) {
          evidence.push({
            id: this.generateEvidenceId(),
            violationId: event.id,
            type: 'screenshot',
            timestamp: Date.now(),
            data: screenshot,
            metadata: {
              eventType: event.eventType,
              userAgent: navigator.userAgent,
              screenResolution: `${screen.width}x${screen.height}`,
              viewport: `${window.innerWidth}x${window.innerHeight}`
            }
          });
        }
      }

      // Collect behavior data
      evidence.push({
        id: this.generateEvidenceId(),
        violationId: event.id,
        type: 'behavior_data',
        timestamp: Date.now(),
        data: event.details,
        metadata: {
          eventType: event.eventType,
          severity: event.severity,
          action: event.action
        }
      });

      // Collect system information
      if (typeof window !== 'undefined') {
        evidence.push({
          id: this.generateEvidenceId(),
          violationId: event.id,
          type: 'system_info',
          timestamp: Date.now(),
          data: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            screen: {
              width: screen.width,
              height: screen.height,
              colorDepth: screen.colorDepth
            },
            location: window.location.href
          },
          metadata: {
            collectionMethod: 'automatic',
            reliability: 'high'
          }
        });
      }

      // Collect clipboard content if relevant
      if (event.eventType === 'copy_paste' || event.eventType === 'clipboard_operation') {
        evidence.push({
          id: this.generateEvidenceId(),
          violationId: event.id,
          type: 'clipboard_content',
          timestamp: Date.now(),
          data: event.details.data || null,
          metadata: {
            action: event.details.action || 'unknown',
            dataLength: event.details.data?.length || 0
          }
        });
      }

    } catch (error) {
      console.error('Error collecting violation evidence:', error);
    }

    return evidence;
  }

  /**
   * Capture screenshot for evidence
   */
  private async captureScreenshot(): Promise<string | null> {
    try {
      // This would require html2canvas or similar library
      // For now, we'll create a placeholder
      return `screenshot_${Date.now()}`;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return null;
    }
  }

  /**
   * Update violation report with new event
   */
  private async updateViolationReport(
    violationKey: string,
    event: ExamSecurityEvent,
    severity: ViolationSeverity,
    evidence: ViolationEvidence[]
  ): Promise<void> {
    let report = this.violationReports.get(violationKey);

    if (!report) {
      report = {
        id: this.generateReportId(),
        examId: event.examId,
        userId: event.userId,
        sessionId: event.sessionId,
        violationCount: 0,
        severityScore: 0,
        riskLevel: 'low',
        violations: [],
        evidence: [],
        trendAnalysis: {
          violationFrequency: 0,
          patternDetection: [],
          repeatOffenderScore: 0,
          coordinatedCheatingIndicators: []
        },
        recommendations: [],
        generatedAt: Date.now(),
        generatedBy: 'system'
      };
    }

    // Add new violation
    report.violations.push(event);
    report.violationCount++;

    // Update severity score
    report.severityScore = Math.min(100, report.severityScore + severity.score);

    // Update risk level
    report.riskLevel = this.calculateRiskLevel(report.severityScore);

    // Add evidence
    report.evidence.push(...evidence);

    // Update trend analysis
    report.trendAnalysis = await this.analyzeViolationTrends(report.violations);

    // Generate recommendations
    report.recommendations = this.generateReportRecommendations(report);

    // Store updated report
    this.violationReports.set(violationKey, report);

    // Store evidence separately
    const existingEvidence = this.violationEvidence.get(violationKey) || [];
    this.violationEvidence.set(violationKey, [...existingEvidence, ...evidence]);
  }

  /**
   * Update violation trends
   */
  private updateViolationTrends(event: ExamSecurityEvent): void {
    const userKey = event.userId;
    let userTrends = this.violationTrends.get(userKey) || [];

    // Find existing trend for this violation type
    let trend = userTrends.find(t => t.violationType === event.eventType);

    if (!trend) {
      trend = {
        userId: event.userId,
        examId: event.examId,
        violationType: event.eventType,
        frequency: 0,
        lastOccurrence: 0,
        pattern: 'new',
        riskScore: 0
      };
      userTrends.push(trend);
    }

    // Update trend
    trend.frequency++;
    trend.lastOccurrence = event.timestamp;
    trend.pattern = this.analyzeTrendPattern(userTrends, event.eventType);
    trend.riskScore = this.calculateTrendRiskScore(trend);

    this.violationTrends.set(userKey, userTrends);
  }

  /**
   * Check escalation thresholds
   */
  private checkEscalationThresholds(
    violationKey: string,
    event: ExamSecurityEvent,
    severity: ViolationSeverity
  ): void {
    const report = this.violationReports.get(violationKey);
    if (!report) return;

    // Check if we've reached escalation threshold
    if (report.violationCount >= severity.escalationThreshold) {
      // Generate escalation alert
      this.generateEscalationAlert(report, event);
    }
  }

  /**
   * Generate alerts for violations
   */
  private generateAlerts(event: ExamSecurityEvent, severity: ViolationSeverity): void {
    const alert = {
      id: this.generateAlertId(),
      type: (severity.level === 'critical' ? 'critical_violation' : 'system_issue') as 'critical_violation' | 'repeat_offender' | 'coordinated_cheating' | 'system_issue',
      message: `Security violation detected: ${event.eventType} (${severity.level} severity)`,
      severity: severity.level,
      examId: event.examId,
      userId: event.userId,
      timestamp: Date.now()
    };

    this.dashboardData.alerts.unshift(alert);

    // Keep only recent alerts
    if (this.dashboardData.alerts.length > 100) {
      this.dashboardData.alerts = this.dashboardData.alerts.slice(0, 100);
    }
  }

  /**
   * Generate escalation alert
   */
  private generateEscalationAlert(report: ViolationReport, event: ExamSecurityEvent): void {
    const alert = {
      id: this.generateAlertId(),
      type: 'repeat_offender' as const,
      message: `Escalation threshold reached for user ${report.userId} in exam ${report.examId}`,
      severity: report.riskLevel,
      examId: report.examId,
      userId: report.userId,
      timestamp: Date.now()
    };

    this.dashboardData.alerts.unshift(alert);
  }

  /**
   * Update dashboard data
   */
  private updateDashboardData(): void {
    try {
      // Update active exams
      const activeExams = examSecurityService.getActiveExams();
      this.dashboardData.activeExams = activeExams.map(exam => {
        const status = examSecurityService.getSecurityStatus(
          exam.examId,
          exam.userId,
          exam.sessionId
        );

        return {
          examId: exam.examId,
          userId: exam.userId,
          violationCount: status?.violations || 0,
          severityScore: status?.securityScore || 100,
          lastViolation: status?.lastHeartbeat || Date.now(),
          status: status?.canContinue ? 'active' : 'terminated'
        };
      });

      // Update system health
      this.dashboardData.systemHealth = {
        totalActiveExams: activeExams.length,
        totalViolations: this.dashboardData.activeExams.reduce((sum, exam) => sum + exam.violationCount, 0),
        criticalViolations: this.dashboardData.alerts.filter(a => a.severity === 'critical').length,
        averageSecurityScore: this.dashboardData.activeExams.length > 0
          ? this.dashboardData.activeExams.reduce((sum, exam) => sum + exam.severityScore, 0) / this.dashboardData.activeExams.length
          : 100
      };

      // Update recent violations
      const allViolations: ExamSecurityEvent[] = [];
      for (const exam of activeExams) {
        const events = examSecurityService.getSecurityEvents(
          exam.examId,
          exam.userId,
          exam.sessionId
        );
        allViolations.push(...events);
      }

      // Sort by timestamp and take most recent 50
      this.dashboardData.recentViolations = allViolations
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);

    } catch (error) {
      console.error('Error updating dashboard data:', error);
    }
  }

  /**
   * Analyze violation trends for a report
   */
  private async analyzeViolationTrends(violations: ExamSecurityEvent[]): Promise<ViolationReport['trendAnalysis']> {
    const violationFrequency = violations.length / Math.max(1, (Date.now() - violations[0]?.timestamp || Date.now()) / (1000 * 60)); // per minute

    const patternDetection = this.detectViolationPatterns(violations);
    const repeatOffenderScore = this.calculateRepeatOffenderScore(violations);
    const coordinatedCheatingIndicators = this.detectCoordinatedCheating(violations);

    return {
      violationFrequency,
      patternDetection,
      repeatOffenderScore,
      coordinatedCheatingIndicators
    };
  }

  /**
   * Detect violation patterns
   */
  private detectViolationPatterns(violations: ExamSecurityEvent[]): string[] {
    const patterns: string[] = [];
    const typeCounts: Record<string, number> = {};

    // Count violation types
    violations.forEach(v => {
      typeCounts[v.eventType] = (typeCounts[v.eventType] || 0) + 1;
    });

    // Detect common patterns
    if (typeCounts['tab_switch'] > violations.length * 0.3) {
      patterns.push('frequent_tab_switching');
    }

    if (typeCounts['copy_paste'] > 3) {
      patterns.push('excessive_copy_paste');
    }

    if (typeCounts['dev_tools'] > 0) {
      patterns.push('developer_tools_usage');
    }

    // Detect timing patterns
    const timestamps = violations.map(v => v.timestamp).sort();
    let timeClusters = 0;
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] - timestamps[i-1] < 5000) { // Within 5 seconds
        timeClusters++;
      }
    }

    if (timeClusters > violations.length * 0.4) {
      patterns.push('clustered_violations');
    }

    return patterns;
  }

  /**
   * Calculate repeat offender score
   */
  private calculateRepeatOffenderScore(violations: ExamSecurityEvent[]): number {
    if (violations.length < 2) return 0;

    const userTrends = this.violationTrends.get(violations[0].userId) || [];
    const totalPreviousViolations = userTrends.reduce((sum, trend) => sum + trend.frequency, 0);

    // Higher score for more previous violations
    return Math.min(100, totalPreviousViolations * 10);
  }

  /**
   * Detect coordinated cheating indicators
   */
  private detectCoordinatedCheating(violations: ExamSecurityEvent[]): string[] {
    const indicators: string[] = [];

    // Look for suspicious timing patterns that might indicate coordination
    const timestamps = violations.map(v => v.timestamp).sort();
    const intervals: number[] = [];

    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i-1]);
    }

    // Check for very regular intervals (might indicate automated coordination)
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const regularityScore = Math.sqrt(variance) / avgInterval;

    if (regularityScore < 0.3 && intervals.length > 5) {
      indicators.push('suspiciously_regular_timing');
    }

    // Check for rapid succession of different violation types
    const quickSuccession = violations.filter((v, i) => {
      if (i === 0) return false;
      return v.timestamp - violations[i-1].timestamp < 2000; // Within 2 seconds
    });

    if (quickSuccession.length > 3) {
      indicators.push('rapid_violation_succession');
    }

    return indicators;
  }

  /**
   * Generate recommended actions based on event and severity
   */
  private generateRecommendedActions(event: ExamSecurityEvent, level: string): string[] {
    const actions: string[] = [];

    switch (event.eventType) {
      case 'tab_switch':
        actions.push('Warn user to stay focused on exam');
        if (level === 'high') {
          actions.push('Consider terminating exam session');
        }
        break;

      case 'copy_paste':
        actions.push('Review clipboard monitoring policies');
        actions.push('Investigate potential unauthorized content access');
        break;

      case 'dev_tools':
        actions.push('Block developer tools access');
        actions.push('Flag for manual review');
        break;

      case 'network_violation':
        actions.push('Check VPN/proxy usage');
        actions.push('Review network security policies');
        break;

      default:
        actions.push('Review security policies');
        actions.push('Monitor user behavior closely');
    }

    if (level === 'critical') {
      actions.push('Immediate administrator notification');
      actions.push('Consider exam termination');
    }

    return actions;
  }

  /**
   * Get penalty weight for severity level
   */
  private getPenaltyWeight(level: string): number {
    switch (level) {
      case 'low': return 0.5;
      case 'medium': return 1.0;
      case 'high': return 1.5;
      case 'critical': return 2.0;
      default: return 1.0;
    }
  }

  /**
   * Get escalation threshold for severity level
   */
  private getEscalationThreshold(level: string): number {
    switch (level) {
      case 'low': return 10;
      case 'medium': return 5;
      case 'high': return 3;
      case 'critical': return 2;
      default: return 5;
    }
  }

  /**
   * Calculate risk level from severity score
   */
  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Analyze trend pattern
   */
  private analyzeTrendPattern(userTrends: ViolationTrend[], violationType: string): string {
    const trend = userTrends.find(t => t.violationType === violationType);
    if (!trend) return 'new';

    if (trend.frequency === 1) return 'first_occurrence';
    if (trend.frequency < 3) return 'occasional';
    if (trend.frequency < 10) return 'frequent';
    return 'chronic';
  }

  /**
   * Calculate trend risk score
   */
  private calculateTrendRiskScore(trend: ViolationTrend): number {
    let score = 0;

    // Frequency factor
    score += trend.frequency * 5;

    // Pattern factor
    switch (trend.pattern) {
      case 'chronic': score += 40; break;
      case 'frequent': score += 25; break;
      case 'occasional': score += 10; break;
      case 'first_occurrence': score += 5; break;
    }

    // Time factor (more recent = higher risk)
    const daysSinceLast = (Date.now() - trend.lastOccurrence) / (1000 * 60 * 60 * 24);
    if (daysSinceLast < 1) score += 20;
    else if (daysSinceLast < 7) score += 10;

    return Math.min(100, score);
  }

  /**
   * Generate report recommendations
   */
  private generateReportRecommendations(report: ViolationReport): string[] {
    const recommendations: string[] = [];

    if (report.severityScore > 70) {
      recommendations.push('Immediate review by administrator required');
      recommendations.push('Consider exam invalidation');
    } else if (report.severityScore > 50) {
      recommendations.push('Manual review of violation evidence recommended');
      recommendations.push('Additional monitoring for this user');
    }

    if (report.trendAnalysis.repeatOffenderScore > 50) {
      recommendations.push('User identified as repeat offender');
      recommendations.push('Review user\'s exam history');
    }

    if (report.trendAnalysis.coordinatedCheatingIndicators.length > 0) {
      recommendations.push('Potential coordinated cheating detected');
      recommendations.push('Investigate multiple users simultaneously');
    }

    return recommendations;
  }

  /**
   * Start auto report generation
   */
  private startAutoReportGeneration(): void {
    this.reportGenerationInterval = setInterval(() => {
      this.generateAutomatedReports();
    }, this.config.reportGenerationInterval * 60 * 1000);
  }

  /**
   * Generate automated reports
   */
  private async generateAutomatedReports(): Promise<void> {
    try {
      // Generate reports for exams with high violation counts
      const activeExams = examSecurityService.getActiveExams();

      for (const exam of activeExams) {
        const status = examSecurityService.getSecurityStatus(
          exam.examId,
          exam.userId,
          exam.sessionId
        );

        if (status && status.violations > 5) {
          await this.generateReport(exam.examId, exam.userId, exam.sessionId, 'system');
        }
      }
    } catch (error) {
      console.error('Error generating automated reports:', error);
    }
  }

  /**
   * Start evidence cleanup
   */
  private startEvidenceCleanup(): void {
    this.evidenceCleanupInterval = setInterval(() => {
      this.cleanupOldEvidence();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Clean up old evidence
   */
  private cleanupOldEvidence(): void {
    const cutoffTime = Date.now() - (this.config.evidenceRetentionDays * 24 * 60 * 60 * 1000);

    // Clean up evidence
    for (const [key, evidence] of this.violationEvidence.entries()) {
      const filteredEvidence = evidence.filter(e => e.timestamp > cutoffTime);
      if (filteredEvidence.length === 0) {
        this.violationEvidence.delete(key);
      } else {
        this.violationEvidence.set(key, filteredEvidence);
      }
    }

    // Clean up old alerts
    this.dashboardData.alerts = this.dashboardData.alerts.filter(
      alert => alert.timestamp > cutoffTime
    );
  }

  /**
   * Generate unique IDs
   */
  private generateReportId(): string {
    return 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateEvidenceId(): string {
    return 'evidence_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateAlertId(): string {
    return 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Public API methods

  /**
   * Get violation report for an exam session
   */
  getViolationReport(examId: string, userId: string, sessionId: string): ViolationReport | null {
    const key = `${examId}_${userId}_${sessionId}`;
    return this.violationReports.get(key) || null;
  }

  /**
   * Get violation evidence for an exam session
   */
  getViolationEvidence(examId: string, userId: string, sessionId: string): ViolationEvidence[] {
    const key = `${examId}_${userId}_${sessionId}`;
    return this.violationEvidence.get(key) || [];
  }

  /**
   * Process a violation event (for integration with other services)
   */
  async processViolation(
    event: ExamSecurityEvent,
    config: any
  ): Promise<{ processed: boolean; severityScore: number; riskLevel: string; recommendations: string[]; evidenceCollected: number }> {
    try {
      // Calculate severity (simplified for integration)
      const severityScore = this.calculateViolationSeverityScore(event);
      const riskLevel = severityScore > 70 ? 'critical' : severityScore > 50 ? 'high' : severityScore > 25 ? 'medium' : 'low';

      // Collect basic evidence
      const evidence = this.collectBasicEvidence(event);

      // Update report
      await this.updateViolationReport(
        `${event.examId}_${event.userId}_${event.sessionId}`,
        event,
        { score: severityScore, level: riskLevel, penaltyWeight: 1, escalationThreshold: 3, recommendedActions: [] },
        evidence
      );

      return {
        processed: true,
        severityScore,
        riskLevel,
        recommendations: [],
        evidenceCollected: evidence.length
      };
    } catch (error) {
      console.error('Error processing violation:', error);
      return {
        processed: false,
        severityScore: 0,
        riskLevel: 'low',
        recommendations: [],
        evidenceCollected: 0
      };
    }
  }

  /**
   * Calculate violation severity score (simplified)
   */
  private calculateViolationSeverityScore(event: ExamSecurityEvent): number {
    const baseScores: Record<string, number> = {
      'tab_switch': 25,
      'fullscreen_exit': 30,
      'copy_paste': 20,
      'right_click': 10,
      'dev_tools': 40,
      'screen_recording': 50,
      'network_violation': 35,
      'clipboard_operation': 15,
      'debug_attempt': 25,
      'secure_comm_breach': 60,
      'mouse_anomaly': 20,
      'keystroke_anomaly': 25,
      'gaze_anomaly': 30,
      'time_pattern_anomaly': 20,
      'behavior_anomaly': 25,
      'coordinated_cheating': 70
    };

    let score = baseScores[event.eventType] || 15;

    // Adjust based on severity level
    switch (event.severity) {
      case 'high': score *= 1.5; break;
      case 'critical': score *= 2; break;
    }

    return Math.min(100, score);
  }

  /**
   * Collect basic evidence for a violation
   */
  private collectBasicEvidence(event: ExamSecurityEvent): ViolationEvidence[] {
    const evidence: ViolationEvidence[] = [];

    // Basic event evidence
    evidence.push({
      id: `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      violationId: event.id,
      type: 'behavior_data',
      timestamp: Date.now(),
      data: event.details,
      metadata: {
        eventType: event.eventType,
        severity: event.severity
      }
    });

    return evidence;
  }

  /**
   * Generate a violation report
   */
  async generateReport(
    examId: string,
    userId: string,
    sessionId: string,
    generatedBy: string
  ): Promise<ViolationReport | null> {
    const report = this.getViolationReport(examId, userId, sessionId);

    if (!report) {
      return null;
    }

    // Update generation info
    report.generatedAt = Date.now();
    report.generatedBy = generatedBy;

    // Log report generation
    auditLogger.logExamSecurity('tab_switch', {
      examId,
      userId,
      sessionId,
      severity: report.riskLevel === 'critical' ? 'critical' : report.riskLevel === 'high' ? 'high' : 'medium',
      description: `Violation report generated with ${report.violationCount} violations`,
      metadata: {
        severityScore: report.severityScore,
        evidenceCount: report.evidence.length,
        generatedBy
      }
    });

    return report;
  }

  /**
   * Get dashboard data
   */
  getDashboardData(): ViolationDashboardData {
    return { ...this.dashboardData };
  }

  /**
   * Get violation trends for a user
   */
  getViolationTrends(userId: string): ViolationTrend[] {
    return this.violationTrends.get(userId) || [];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ViolationReportingConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart services if needed
    if (newConfig.autoReportGeneration !== undefined) {
      if (newConfig.autoReportGeneration && !this.reportGenerationInterval) {
        this.startAutoReportGeneration();
      } else if (!newConfig.autoReportGeneration && this.reportGenerationInterval) {
        clearInterval(this.reportGenerationInterval);
        this.reportGenerationInterval = null;
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ViolationReportingConfig {
    return { ...this.config };
  }

  /**
   * Clear old data
   */
  clearOldData(olderThanDays: number = 30): void {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    // Clear old reports
    for (const [key, report] of this.violationReports.entries()) {
      if (report.generatedAt < cutoffTime) {
        this.violationReports.delete(key);
      }
    }

    // Clear old trends
    for (const [userId, trends] of this.violationTrends.entries()) {
      const filteredTrends = trends.filter(trend => trend.lastOccurrence > cutoffTime);
      if (filteredTrends.length === 0) {
        this.violationTrends.delete(userId);
      } else {
        this.violationTrends.set(userId, filteredTrends);
      }
    }
  }

  /**
   * Export violation data
   */
  exportViolationData(
    startTime: number,
    endTime: number,
    format: 'json' | 'csv' = 'json'
  ): any {
    const reports: ViolationReport[] = [];
    const evidence: ViolationEvidence[] = [];
    const trends: ViolationTrend[] = [];

    // Collect data within time range
    for (const report of this.violationReports.values()) {
      if (report.generatedAt >= startTime && report.generatedAt <= endTime) {
        reports.push(report);
      }
    }

    for (const evidenceList of this.violationEvidence.values()) {
      const filteredEvidence = evidenceList.filter(
        e => e.timestamp >= startTime && e.timestamp <= endTime
      );
      evidence.push(...filteredEvidence);
    }

    for (const trendList of this.violationTrends.values()) {
      const filteredTrends = trendList.filter(
        t => t.lastOccurrence >= startTime && t.lastOccurrence <= endTime
      );
      trends.push(...filteredTrends);
    }

    if (format === 'csv') {
      // Convert to CSV format
      return this.convertToCSV({ reports, evidence, trends });
    }

    return { reports, evidence, trends };
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    // This would implement CSV conversion logic
    // For now, return JSON string
    return JSON.stringify(data, null, 2);
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    if (this.reportGenerationInterval) {
      clearInterval(this.reportGenerationInterval);
      this.reportGenerationInterval = null;
    }

    if (this.evidenceCleanupInterval) {
      clearInterval(this.evidenceCleanupInterval);
      this.evidenceCleanupInterval = null;
    }

    // Clear all data
    this.violationReports.clear();
    this.violationEvidence.clear();
    this.violationTrends.clear();
    this.violationTrends.clear();
  }
}

export const violationReportingService = ViolationReportingService.getInstance();
export default violationReportingService;
