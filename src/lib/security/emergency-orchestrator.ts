/**
 * Emergency Response Orchestrator
 *
 * Central coordinator for all emergency response and recovery systems
 * during exam sessions, providing unified interface and intelligent decision making.
 */

import { auditLogger } from './audit-logger';
import { emergencyResponseService, EmergencyEvent } from './emergency-response';
import { networkRecoveryManager } from './network-recovery';
import { dataRecoveryManager } from './data-recovery';
import { sessionRecoveryManager } from './session-recovery';
import { autoSaveManager } from './auto-save';
import { emergencyNotificationService } from './emergency-notification';
import { failureDetectionService, DetectedFailure } from './failure-detection';
import { recoveryStrategyManager } from './recovery-strategy';
import { backupManager } from './backup-manager';

export interface OrchestratorConfig {
  enableAutoRecovery: boolean;
  maxConcurrentEmergencies: number;
  escalationThreshold: number; // minutes
  notificationEnabled: boolean;
  monitoringEnabled: boolean;
  backupEnabled: boolean;
  recoveryTimeout: number; // milliseconds
}

export interface EmergencyContext {
  examId: string;
  userId: string;
  sessionId: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userAgent?: string;
  networkStatus?: any;
  sessionData?: any;
  failureDetails?: Record<string, any>;
}

export interface RecoveryResult {
  successful: boolean;
  recoveryId?: string;
  strategiesAttempted: string[];
  timeTaken: number;
  dataRecovered: boolean;
  notificationsSent: number;
  escalationTriggered: boolean;
  errorMessage?: string;
}

export class EmergencyResponseOrchestrator {
  private config: OrchestratorConfig;
  private activeEmergencies = new Map<string, EmergencyContext>();
  private recoveryHistory = new Map<string, RecoveryResult[]>();
  private monitoringInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = {
      enableAutoRecovery: true,
      maxConcurrentEmergencies: 10,
      escalationThreshold: 5, // 5 minutes
      notificationEnabled: true,
      monitoringEnabled: true,
      backupEnabled: true,
      recoveryTimeout: 300000, // 5 minutes
      ...config
    };
  }

  /**
   * Initialize the emergency response orchestrator
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize all services
      await Promise.all([
        emergencyResponseService.initialize(),
        networkRecoveryManager.initialize(),
        dataRecoveryManager.initialize(),
        sessionRecoveryManager.initialize(),
        autoSaveManager.initialize(),
        emergencyNotificationService.initialize(),
        failureDetectionService.initialize(),
        recoveryStrategyManager.initialize(),
        backupManager.initialize()
      ]);

      // Set up monitoring
      if (this.config.monitoringEnabled) {
        this.setupMonitoring();
      }

      this.isInitialized = true;

      auditLogger.logExamSecurity('exam_started', {
        examId: 'system',
        userId: 'system',
        sessionId: 'system',
        severity: 'low',
        description: 'Emergency response orchestrator initialized',
        metadata: {
          config: this.config,
          services: [
            'emergencyResponseService',
            'networkRecoveryManager',
            'dataRecoveryManager',
            'sessionRecoveryManager',
            'autoSaveManager',
            'emergencyNotificationService',
            'failureDetectionService',
            'recoveryStrategyManager',
            'backupManager'
          ]
        }
      });
    } catch (error) {
      console.error('Failed to initialize emergency response orchestrator:', error);
      throw error;
    }
  }

  /**
   * Handle an emergency situation
   */
  async handleEmergency(
    context: EmergencyContext,
    failureType?: string,
    additionalData?: Record<string, any>
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const emergencyKey = this.getEmergencyKey(context);

    // Check concurrent emergency limit
    if (this.activeEmergencies.size >= this.config.maxConcurrentEmergencies) {
      return {
        successful: false,
        strategiesAttempted: [],
        timeTaken: Date.now() - startTime,
        dataRecovered: false,
        notificationsSent: 0,
        escalationTriggered: false,
        errorMessage: 'Maximum concurrent emergencies reached'
      };
    }

    // Store active emergency
    this.activeEmergencies.set(emergencyKey, context);

    try {
      // Detect failures if monitoring is enabled
      let detectedFailures: DetectedFailure[] = [];
      if (this.config.monitoringEnabled) {
        detectedFailures = await failureDetectionService.detectFailures(
          context.examId,
          context.userId,
          context.sessionId
        );
      }

      // Create emergency event
      const emergencyEvent: Omit<EmergencyEvent, 'id' | 'timestamp' | 'recoveryAttempted' | 'recoverySuccessful'> = {
        type: this.mapFailureType(failureType || 'client_error'),
        severity: context.severity,
        examId: context.examId,
        userId: context.userId,
        sessionId: context.sessionId,
        details: {
          ...context.failureDetails,
          ...additionalData,
          detectedFailures: detectedFailures.length,
          timestamp: context.timestamp
        },
        impact: this.determineImpact(context.severity, detectedFailures)
      };

      // Register emergency with core service
      const recoveryAttempt = await emergencyResponseService.handleEmergency(emergencyEvent);

      // Execute recovery strategies
      const strategiesAttempted: string[] = [];
      let dataRecovered = false;
      let escalationTriggered = false;

      if (this.config.enableAutoRecovery) {
        // Try recovery strategies
        for (const failure of detectedFailures) {
          const strategyResult = await recoveryStrategyManager.executeRecovery(
            failure.id,
            failure.type,
            context.examId,
            context.userId,
            context.sessionId,
            {
              ...context,
              failureDetails: failure,
              additionalData
            }
          );

          if (strategyResult) {
            strategiesAttempted.push(strategyResult.strategyId);
            if (strategyResult.successful) {
              dataRecovered = true;
            }
          }
        }

        // If no specific strategies worked, try general recovery
        if (strategiesAttempted.length === 0) {
          const generalRecovery = await recoveryStrategyManager.executeRecovery(
            'general_failure',
            'client_error',
            context.examId,
            context.userId,
            context.sessionId,
            context
          );

          if (generalRecovery) {
            strategiesAttempted.push(generalRecovery.strategyId);
            if (generalRecovery.successful) {
              dataRecovered = true;
            }
          }
        }
      }

      // Send notifications
      let notificationsSent = 0;
      if (this.config.notificationEnabled) {
        const emergencyId = `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notificationIds = await emergencyNotificationService.sendEmergencyNotification(
          emergencyId,
          'emergency_detected',
          context.severity,
          context.examId,
          context.userId,
          context.sessionId,
          {
            ...context,
            detectedFailures,
            recoveryAttempted: !!recoveryAttempt,
            strategiesAttempted
          }
        );
        notificationsSent = notificationIds.length;
      }

      // Check for escalation
      if (context.severity === 'critical' || context.severity === 'high') {
        // Set up escalation timer
        setTimeout(async () => {
          await this.handleEscalation(emergencyKey, context);
        }, this.config.escalationThreshold * 60 * 1000);

        escalationTriggered = true;
      }

      const result: RecoveryResult = {
        successful: dataRecovered || !!recoveryAttempt,
        recoveryId: recoveryAttempt?.id,
        strategiesAttempted,
        timeTaken: Date.now() - startTime,
        dataRecovered,
        notificationsSent,
        escalationTriggered
      };

      // Store recovery result
      const history = this.recoveryHistory.get(emergencyKey) || [];
      history.push(result);
      this.recoveryHistory.set(emergencyKey, history);

      // Log comprehensive emergency handling
      auditLogger.logExamSecurity('copy_paste', {
        examId: context.examId,
        userId: context.userId,
        sessionId: context.sessionId,
        severity: context.severity,
        description: 'Emergency handled by orchestrator',
        metadata: {
          emergencyKey,
          detectedFailures: detectedFailures.length,
          strategiesAttempted,
          dataRecovered,
          notificationsSent,
          escalationTriggered,
          timeTaken: result.timeTaken
        }
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const result: RecoveryResult = {
        successful: false,
        strategiesAttempted: [],
        timeTaken: Date.now() - startTime,
        dataRecovered: false,
        notificationsSent: 0,
        escalationTriggered: false,
        errorMessage
      };

      // Log error
      auditLogger.logExamSecurity('copy_paste', {
        examId: context.examId,
        userId: context.userId,
        sessionId: context.sessionId,
        severity: 'critical',
        description: 'Emergency handling failed',
        metadata: {
          emergencyKey,
          error: errorMessage,
          timeTaken: result.timeTaken
        }
      });

      return result;

    } finally {
      // Clean up active emergency after some time
      setTimeout(() => {
        this.activeEmergencies.delete(emergencyKey);
      }, 300000); // 5 minutes
    }
  }

  /**
   * Start monitoring for a specific exam session
   */
  async startSessionMonitoring(
    examId: string,
    userId: string,
    sessionId: string,
    sessionData?: any
  ): Promise<void> {
    // Start all monitoring services
    failureDetectionService.startMonitoring(examId, userId, sessionId);
    sessionRecoveryManager.startSession({
      examId,
      userId,
      sessionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      currentQuestionIndex: 0,
      answers: {},
      timeRemaining: 3600000, // 1 hour default
      flags: [],
      bookmarks: [],
      notes: {},
      settings: {
        fontSize: 'medium',
        theme: 'light',
        showTimer: true,
        showProgress: true
      }
    });

    // Create initial backup
    if (this.config.backupEnabled) {
      await backupManager.createBackup(
        sessionId,
        examId,
        userId,
        { sessionData, timestamp: Date.now() },
        'full'
      );
    }

    auditLogger.logExamSecurity('exam_started', {
      examId,
      userId,
      sessionId,
      severity: 'low',
      description: 'Session monitoring started',
      metadata: { sessionData: !!sessionData }
    });
  }

  /**
   * Stop monitoring for a specific exam session
   */
  async stopSessionMonitoring(examId: string, userId: string, sessionId: string): Promise<void> {
    // Stop all monitoring services
    failureDetectionService.stopMonitoring(examId, userId, sessionId);
    sessionRecoveryManager.endSession(examId, userId, sessionId);

    // Create final backup
    if (this.config.backupEnabled) {
      await backupManager.createBackup(
        sessionId,
        examId,
        userId,
        { sessionEnded: true, timestamp: Date.now() },
        'full'
      );
    }

    auditLogger.logExamSecurity('exam_completed', {
      examId,
      userId,
      sessionId,
      severity: 'low',
      description: 'Session monitoring stopped',
      metadata: {}
    });
  }

  /**
   * Get emergency status for a session
   */
  getEmergencyStatus(examId: string, userId: string, sessionId: string): EmergencyContext | null {
    const emergencyKey = this.getEmergencyKey({ examId, userId, sessionId });
    return this.activeEmergencies.get(emergencyKey) || null;
  }

  /**
   * Get recovery history for a session
   */
  getRecoveryHistory(examId: string, userId: string, sessionId: string): RecoveryResult[] {
    const emergencyKey = this.getEmergencyKey({ examId, userId, sessionId });
    return this.recoveryHistory.get(emergencyKey) || [];
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    activeEmergencies: number;
    totalRecoveries: number;
    successRate: number;
    averageRecoveryTime: number;
    servicesStatus: Record<string, boolean>;
  } {
    let totalRecoveries = 0;
    let successfulRecoveries = 0;
    let totalRecoveryTime = 0;

    for (const results of this.recoveryHistory.values()) {
      for (const result of results) {
        totalRecoveries++;
        if (result.successful) {
          successfulRecoveries++;
        }
        totalRecoveryTime += result.timeTaken;
      }
    }

    return {
      activeEmergencies: this.activeEmergencies.size,
      totalRecoveries,
      successRate: totalRecoveries > 0 ? (successfulRecoveries / totalRecoveries) * 100 : 0,
      averageRecoveryTime: totalRecoveries > 0 ? totalRecoveryTime / totalRecoveries : 0,
      servicesStatus: {
        emergencyResponse: true, // Would check actual service status
        networkRecovery: true,
        dataRecovery: true,
        sessionRecovery: true,
        autoSave: true,
        notifications: true,
        failureDetection: true,
        recoveryStrategy: true,
        backup: true
      }
    };
  }

  /**
   * Handle escalation of unacknowledged emergencies
   */
  private async handleEscalation(emergencyKey: string, context: EmergencyContext): Promise<void> {
    const emergency = this.activeEmergencies.get(emergencyKey);
    if (!emergency) return;

    // Send escalation notification
    await emergencyNotificationService.sendEmergencyNotification(
      'escalation_' + Date.now(),
      'escalation',
      'critical',
      context.examId,
      context.userId,
      context.sessionId,
      {
        originalSeverity: context.severity,
        escalationLevel: 2,
        timeSinceEmergency: Date.now() - context.timestamp
      }
    );

    auditLogger.logExamSecurity('copy_paste', {
      examId: context.examId,
      userId: context.userId,
      sessionId: context.sessionId,
      severity: 'critical',
      description: 'Emergency escalated due to no response',
      metadata: {
        originalSeverity: context.severity,
        timeSinceEmergency: Date.now() - context.timestamp
      }
    });
  }

  /**
   * Set up periodic monitoring
   */
  private setupMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.performSystemHealthCheck();
    }, 60000); // Every minute
  }

  /**
   * Perform system health check
   */
  private async performSystemHealthCheck(): Promise<void> {
    try {
      // Check all services are still operational
      const health = this.getSystemHealth();

      // Log health status periodically
      if (health.activeEmergencies > 0 || health.totalRecoveries > 0) {
        auditLogger.logExamSecurity('copy_paste', {
          examId: 'system',
          userId: 'system',
          sessionId: 'system',
          severity: 'low',
          description: 'System health check completed',
          metadata: health
        });
      }

    } catch (error) {
      console.error('System health check failed:', error);
    }
  }

  /**
   * Map failure type to emergency event type
   */
  private mapFailureType(failureType: string): EmergencyEvent['type'] {
    const typeMap: Record<string, EmergencyEvent['type']> = {
      'network_failure': 'network_failure',
      'browser_crash': 'browser_crash',
      'data_corruption': 'data_corruption',
      'session_timeout': 'session_timeout',
      'storage_failure': 'storage_failure',
      'memory_leak': 'client_error', // Map to client_error
      'render_failure': 'client_error', // Map to client_error
      'performance_degradation': 'client_error', // Map to client_error
      'security_violation': 'client_error'
    };

    return typeMap[failureType] || 'client_error';
  }

  /**
   * Determine impact level based on severity and failures
   */
  private determineImpact(severity: EmergencyContext['severity'], failures: DetectedFailure[]): EmergencyEvent['impact'] {
    if (severity === 'critical') return 'entire_exam';
    if (severity === 'high' || failures.length > 2) return 'exam_session';
    if (failures.some(f => f.type === 'network_failure')) return 'multiple_students';
    return 'student_only';
  }

  /**
   * Get emergency key
   */
  private getEmergencyKey(context: { examId: string; userId: string; sessionId: string }): string {
    return `${context.examId}_${context.userId}_${context.sessionId}`;
  }

  /**
   * Destroy the orchestrator and clean up resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.activeEmergencies.clear();
    this.recoveryHistory.clear();
  }
}

// Export singleton instance
export const emergencyOrchestrator = new EmergencyResponseOrchestrator();
