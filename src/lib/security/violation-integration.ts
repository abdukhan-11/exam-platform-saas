/**
 * Violation Integration Module
 *
 * This module integrates all violation reporting components with the existing
 * exam security infrastructure, providing a unified interface for comprehensive
 * violation detection, analysis, and reporting.
 */

import { ExamSecurityEvent, ExamSecurityConfig } from './exam-security';
import { violationReportingService, ViolationReport } from './violation-reporting';
import { evidenceCollectionService } from './evidence-collection';
import { severityScoringSystem, ScoringContext } from './severity-scoring';
import { trendAnalysisEngine } from './trend-analysis';
import { automatedReportGenerator } from './automated-report-generator';
import { auditLogger } from './audit-logger';

export interface ViolationIntegrationConfig {
  enableViolationReporting: boolean;
  enableEvidenceCollection: boolean;
  enableSeverityScoring: boolean;
  enableTrendAnalysis: boolean;
  enableAutomatedReports: boolean;
  reportGenerationThresholds: {
    minViolations: number;
    minSeverityScore: number;
    timeWindowMinutes: number;
  };
  escalationSettings: {
    autoEscalateCritical: boolean;
    notifyAdministrators: boolean;
    generateIncidentReports: boolean;
  };
}

export interface ViolationProcessingResult {
  processed: boolean;
  reportGenerated: boolean;
  escalated: boolean;
  severityScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  evidenceCollected: number;
  processingTime: number;
}

class ViolationIntegrationService {
  private static instance: ViolationIntegrationService;
  private config: ViolationIntegrationConfig;
  private processingQueue: Array<{
    event: ExamSecurityEvent;
    config: ExamSecurityConfig;
    timestamp: number;
  }> = [];
  private isProcessing = false;

  private defaultConfig: ViolationIntegrationConfig = {
    enableViolationReporting: true,
    enableEvidenceCollection: true,
    enableSeverityScoring: true,
    enableTrendAnalysis: true,
    enableAutomatedReports: true,
    reportGenerationThresholds: {
      minViolations: 3,
      minSeverityScore: 50,
      timeWindowMinutes: 30
    },
    escalationSettings: {
      autoEscalateCritical: true,
      notifyAdministrators: true,
      generateIncidentReports: true
    }
  };

  static getInstance(): ViolationIntegrationService {
    if (!ViolationIntegrationService.instance) {
      ViolationIntegrationService.instance = new ViolationIntegrationService();
    }
    return ViolationIntegrationService.instance;
  }

  constructor() {
    this.config = { ...this.defaultConfig };
    this.initializeIntegration();
  }

  /**
   * Initialize the integration service
   */
  private initializeIntegration(): void {
    // Initialize all services
    if (this.config.enableEvidenceCollection) {
      evidenceCollectionService.initialize();
    }

    // Start processing queue
    this.startQueueProcessing();

    auditLogger.logSecurity('violation_integration_initialized', {
      severity: 'low',
      description: 'Violation integration service initialized',
      metadata: { config: this.config }
    });
  }

  /**
   * Process a security violation event
   */
  async processViolation(
    event: ExamSecurityEvent,
    examConfig: ExamSecurityConfig
  ): Promise<ViolationProcessingResult> {
    const startTime = Date.now();

    const result: ViolationProcessingResult = {
      processed: false,
      reportGenerated: false,
      escalated: false,
      severityScore: 0,
      riskLevel: 'low',
      recommendations: [],
      evidenceCollected: 0,
      processingTime: 0
    };

    try {
      // Add to processing queue
      this.processingQueue.push({
        event,
        config: examConfig,
        timestamp: Date.now()
      });

      // If not currently processing, start processing
      if (!this.isProcessing) {
        await this.processQueue();
      }

      // Calculate severity score if enabled
      if (this.config.enableSeverityScoring) {
        const severityContext: ScoringContext = {
          userId: event.userId,
          sessionId: event.sessionId,
          examId: event.examId,
          violation: event,
          userHistory: null, // Will be fetched by the scoring system
          currentTime: Date.now(),
          examContext: {
            isHighStakes: examConfig.duration > 120, // Exams longer than 2 hours considered high-stakes
            timeRemaining: examConfig.endTime - Date.now(),
            questionNumber: 0, // Not available in current context
            totalQuestions: 0 // Not available in current context
          },
          environmentContext: {
            isBusinessHours: this.isBusinessHours(),
            networkQuality: 'good', // Could be enhanced with actual network monitoring
            deviceType: 'desktop' // Could be enhanced with device detection
          }
        };

        const severityScore = await severityScoringSystem.calculateSeverity(severityContext);
        result.severityScore = severityScore.totalScore;
        result.riskLevel = severityScore.riskLevel;
        result.recommendations = severityScore.recommendedActions;
      }

      // Collect evidence if enabled
      if (this.config.enableEvidenceCollection) {
        const evidence = await evidenceCollectionService.collectViolationEvidence(event, event.sessionId);
        result.evidenceCollected = evidence.length;
      }

      // Check for escalation
      if (this.shouldEscalate(event, result.severityScore)) {
        result.escalated = true;
        await this.handleEscalation(event, examConfig, result);
      }

      // Check if report should be generated
      if (this.shouldGenerateReport(event, examConfig)) {
        result.reportGenerated = true;
        await this.generateViolationReport(event, examConfig);
      }

      result.processed = true;
      result.processingTime = Date.now() - startTime;

      // Log successful processing
      auditLogger.logSecurity('violation_processed', {
        examId: event.examId,
        userId: event.userId,
        sessionId: event.sessionId,
        severity: result.riskLevel,
        description: `Violation processed successfully: ${event.eventType}`,
        metadata: {
          severityScore: result.severityScore,
          evidenceCollected: result.evidenceCollected,
          escalated: result.escalated,
          reportGenerated: result.reportGenerated,
          processingTime: result.processingTime
        }
      });

    } catch (error) {
      console.error('Error processing violation:', error);

      // Log processing error
      auditLogger.logSecurity('violation_processing_failed', {
        examId: event.examId,
        userId: event.userId,
        sessionId: event.sessionId,
        severity: 'high',
        description: 'Failed to process security violation',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          violationType: event.eventType,
          processingTime: Date.now() - startTime
        }
      });
    }

    return result;
  }

  /**
   * Process the violation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process items in batches to avoid overwhelming the system
      const batchSize = 10;
      const batch = this.processingQueue.splice(0, batchSize);

      for (const item of batch) {
        await this.processViolation(item.event, item.config);
      }

      // Continue processing if there are more items
      if (this.processingQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100); // Small delay between batches
      }

    } catch (error) {
      console.error('Error processing violation queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start queue processing
   */
  private startQueueProcessing(): void {
    setInterval(() => {
      if (!this.isProcessing && this.processingQueue.length > 0) {
        this.processQueue();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check if violation should be escalated
   */
  private shouldEscalate(event: ExamSecurityEvent, severityScore: number): boolean {
    if (!this.config.escalationSettings.autoEscalateCritical) {
      return false;
    }

    // Escalate critical violations
    if (event.severity === 'critical' || severityScore >= 80) {
      return true;
    }

    // Escalate high-severity violations with specific types
    if (event.severity === 'high' && severityScore >= 60) {
      const highRiskTypes = [
        'secure_comm_breach',
        'coordinated_cheating',
        'screen_recording',
        'dev_tools'
      ];

      if (highRiskTypes.includes(event.eventType)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Handle violation escalation
   */
  private async handleEscalation(
    event: ExamSecurityEvent,
    examConfig: ExamSecurityConfig,
    result: ViolationProcessingResult
  ): Promise<void> {
    try {
      // Generate incident report if enabled
      if (this.config.escalationSettings.generateIncidentReports) {
        const report = await automatedReportGenerator.generateReport('incident_report', {
          violations: [event],
          timeRange: {
            start: Date.now() - (60 * 60 * 1000), // Last hour
            end: Date.now()
          }
        }, {
          priority: result.riskLevel as any,
          recipients: ['security_team', 'academic_integrity_officer']
        });

        if (report) {
          auditLogger.logSecurity('incident_report_generated', {
            examId: event.examId,
            userId: event.userId,
            sessionId: event.sessionId,
            severity: 'high',
            description: `Incident report generated for escalated violation: ${event.eventType}`,
            metadata: {
              reportId: report.id,
              severityScore: result.severityScore,
              riskLevel: result.riskLevel
            }
          });
        }
      }

      // Log escalation
      auditLogger.logSecurity('violation_escalated', {
        examId: event.examId,
        userId: event.userId,
        sessionId: event.sessionId,
        severity: result.riskLevel,
        description: `Security violation escalated: ${event.eventType}`,
        metadata: {
          severityScore: result.severityScore,
          recommendations: result.recommendations,
          evidenceCollected: result.evidenceCollected
        }
      });

    } catch (error) {
      console.error('Error handling escalation:', error);
    }
  }

  /**
   * Check if report should be generated
   */
  private shouldGenerateReport(event: ExamSecurityEvent, examConfig: ExamSecurityConfig): boolean {
    if (!this.config.enableAutomatedReports) {
      return false;
    }

    // Get recent violations for this user
    const recentViolations = this.getRecentViolations(event.userId, this.config.reportGenerationThresholds.timeWindowMinutes);

    // Check thresholds
    const thresholds = this.config.reportGenerationThresholds;

    return (
      recentViolations.length >= thresholds.minViolations ||
      (event.severity === 'high' || event.severity === 'critical')
    );
  }

  /**
   * Generate violation report
   */
  private async generateViolationReport(
    event: ExamSecurityEvent,
    examConfig: ExamSecurityConfig
  ): Promise<void> {
    try {
      // Get violation history for context
      const violations = this.getRecentViolations(event.userId, 60); // Last hour

      const report = await automatedReportGenerator.generateReport('incident_report', {
        violations: [event, ...violations],
        timeRange: {
          start: Date.now() - (60 * 60 * 1000), // Last hour
          end: Date.now()
        }
      }, {
        priority: event.severity as any,
        recipients: ['exam_coordinator', 'instructor']
      });

      if (report) {
        auditLogger.logSecurity('violation_report_generated', {
          examId: event.examId,
          userId: event.userId,
          sessionId: event.sessionId,
          severity: event.severity,
          description: `Automated violation report generated: ${event.eventType}`,
          metadata: {
            reportId: report.id,
            violationCount: violations.length + 1
          }
        });
      }

    } catch (error) {
      console.error('Error generating violation report:', error);
    }
  }

  /**
   * Get recent violations for a user
   */
  private getRecentViolations(userId: string, minutes: number): ExamSecurityEvent[] {
    // This would need to be implemented to fetch from a data store
    // For now, return an empty array
    return [];
  }

  /**
   * Check if current time is business hours
   */
  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Business hours: Monday-Friday, 9 AM - 6 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
  }

  /**
   * Get integration statistics
   */
  getStatistics(): {
    queueSize: number;
    processingStatus: boolean;
    processedToday: number;
    escalatedToday: number;
    reportsGeneratedToday: number;
  } {
    // This would track actual statistics
    return {
      queueSize: this.processingQueue.length,
      processingStatus: this.isProcessing,
      processedToday: 0, // Would be tracked
      escalatedToday: 0, // Would be tracked
      reportsGeneratedToday: 0 // Would be tracked
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ViolationIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ViolationIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Export integration data
   */
  exportIntegrationData(format: 'json' | 'csv' = 'json'): any {
    const data = {
      config: this.config,
      statistics: this.getStatistics(),
      queueSize: this.processingQueue.length,
      exportTimestamp: Date.now()
    };

    if (format === 'csv') {
      return JSON.stringify(data, null, 2); // Simplified CSV conversion
    }

    return data;
  }

  /**
   * Shutdown the integration service
   */
  shutdown(): void {
    this.processingQueue.length = 0;
    this.isProcessing = false;
  }
}

export const violationIntegrationService = ViolationIntegrationService.getInstance();
export default violationIntegrationService;
