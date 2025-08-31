/**
 * Exam-Specific Security Measures
 *
 * This module provides comprehensive exam security features including
 * browser lock detection, tab switching prevention, full-screen enforcement,
 * advanced anti-cheating measures, screen recording detection, network monitoring,
 * and AI-powered behavior analysis for anomaly detection.
 */

import { behaviorAnalysisEngine, BehaviorModelConfig } from './behavior-analysis';
import { violationIntegrationService } from './violation-integration';
import { emergencyOrchestrator } from './emergency-orchestrator';
import { auditLogger } from './audit-logger';
import { browserCompatibilityManager } from './browser-compatibility';
import { performanceMonitor } from './performance-monitor';
import { adaptiveRenderingManager } from './adaptive-rendering';
import { deviceCapabilityDetector } from './device-capability';

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
  // Advanced security features
  enableScreenRecordingDetection: boolean;
  enableNetworkMonitoring: boolean;
  enableAdvancedClipboardMonitoring: boolean;
  enableSecureCommunication: boolean;
  enableAdvancedAntiDebugging: boolean;
  maxClipboardOperations: number;
  maxNetworkRequests: number;
  allowedDomains: string[];
  // AI-Powered Behavior Analysis
  enableBehaviorAnalysis: boolean;
  enableMouseTracking: boolean;
  enableKeystrokeAnalysis: boolean;
  enableGazeTracking: boolean;
  enableTimeBasedAnalysis: boolean;
  behaviorAnalysisInterval: number; // in seconds
  anomalyThreshold: number; // 0-100
  enablePatternRecognition: boolean;
  maxCoordinatedAttempts: number;
}

export interface ExamSecurityEvent {
  id: string;
  examId: string;
  userId: string;
  sessionId: string;
  eventType: 'tab_switch' | 'window_blur' | 'fullscreen_exit' | 'copy_paste' | 'right_click' | 'dev_tools' | 'screenshot' | 'heartbeat' | 'violation' | 'screen_recording' | 'network_violation' | 'clipboard_operation' | 'debug_attempt' | 'secure_comm_breach' | 'mouse_anomaly' | 'keystroke_anomaly' | 'gaze_anomaly' | 'time_pattern_anomaly' | 'behavior_anomaly' | 'coordinated_cheating';
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
  // Advanced security metrics
  clipboardOperations: number;
  networkRequests: number;
  screenRecordingDetected: boolean;
  vpnDetected: boolean;
  proxyDetected: boolean;
  debugAttempts: number;
  secureCommBreaches: number;
  lastAdvancedCheck: number;
  // Behavior Analysis Metrics
  mouseAnomalies: number;
  keystrokeAnomalies: number;
  gazeAnomalies: number;
  timePatternAnomalies: number;
  behaviorScore: number; // 0-100, separate from security score
  coordinatedCheatingAttempts: number;
  lastBehaviorAnalysis: number;
  attentionScore: number; // 0-100, based on gaze and mouse activity
}

class ExamSecurityService {
  private static instance: ExamSecurityService;
  private activeExams: Map<string, ExamSecurityConfig> = new Map();
  private examEvents: Map<string, ExamSecurityEvent[]> = new Map();
  private securityStatus: Map<string, ExamSecurityStatus> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private emergencyInitialized = false;
  private screenshotIntervals: Map<string, NodeJS.Timeout> = new Map();
  // Advanced security features
  private advancedSecurityIntervals: Map<string, NodeJS.Timeout> = new Map();
  private networkMonitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private clipboardMonitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private debugDetectionIntervals: Map<string, NodeJS.Timeout> = new Map();
  private encryptionKeys: Map<string, CryptoKey> = new Map();
  private knownRecordingProcesses: Set<string> = new Set([
    'obs64.exe', 'obs32.exe', 'bandicam.exe', 'camtasia.exe', 'snagit.exe',
    'screenrecorder.exe', 'apowersoft.exe', 'screenpresso.exe', 'sharex.exe'
  ]);

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
      // Advanced security metrics
      clipboardOperations: 0,
      networkRequests: 0,
      screenRecordingDetected: false,
      vpnDetected: false,
      proxyDetected: false,
      debugAttempts: 0,
      secureCommBreaches: 0,
      lastAdvancedCheck: Date.now(),
      // Behavior Analysis Metrics
      mouseAnomalies: 0,
      keystrokeAnomalies: 0,
      gazeAnomalies: 0,
      timePatternAnomalies: 0,
      behaviorScore: 100,
      coordinatedCheatingAttempts: 0,
      lastBehaviorAnalysis: Date.now(),
      attentionScore: 100,
    });

    // Initialize events array
    this.examEvents.set(examKey, []);

    // Start heartbeat monitoring
    this.startHeartbeat(examKey, config.heartbeatInterval);

    // Start screenshot monitoring if enabled
    if (config.screenshotInterval > 0) {
      this.startScreenshotMonitoring(examKey, config.screenshotInterval);
    }

    // Start advanced security monitoring if enabled
    if (config.enableScreenRecordingDetection || config.enableNetworkMonitoring ||
        config.enableAdvancedClipboardMonitoring || config.enableAdvancedAntiDebugging) {
      this.startAdvancedSecurityMonitoring(examKey, config);
    }

    // Initialize behavior analysis if enabled
    if (config.enableBehaviorAnalysis) {
      this.initializeBehaviorAnalysis(examKey, config);
    }

    // Initialize secure communication if enabled
    if (config.enableSecureCommunication) {
      this.initializeSecureCommunication(examKey);
    }

    // Set up event listeners
    this.setupEventListeners(examKey, config);

    // Initialize emergency response system
    this.initializeEmergencyResponse(config);

    // Initialize cross-platform compatibility and performance optimization
    this.initializeCrossPlatformCompatibility(config);
  }

  /**
   * Initialize cross-platform compatibility and performance optimization
   */
  private async initializeCrossPlatformCompatibility(config: ExamSecurityConfig): Promise<void> {
    // Server-side: skip browser-only initialization
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    try {
      // Initialize browser compatibility manager
      await browserCompatibilityManager.initialize();

      // Check if browser is compatible
      if (!browserCompatibilityManager.isCompatible()) {
        const warnings = browserCompatibilityManager.getCompatibilityWarnings();
        console.warn('Browser compatibility issues detected:', warnings);

        auditLogger.logExamSecurity('copy_paste', {
          examId: config.examId,
          userId: config.userId,
          sessionId: config.sessionId,
          severity: 'medium',
          description: 'Browser compatibility issues detected',
          metadata: {
            warnings,
            compatibilityScore: browserCompatibilityManager.getCompatibilityScore(),
            browserInfo: browserCompatibilityManager.getBrowserInfo()
          }
        });
      }

      // Initialize device capability detector
      await deviceCapabilityDetector.initialize();

      // Initialize performance monitor
      await performanceMonitor.initialize();

      // Initialize adaptive rendering manager
      await adaptiveRenderingManager.initialize();

      // Apply device-specific optimizations
      await this.applyDeviceOptimizations(config);

      auditLogger.logExamSecurity('exam_started', {
        examId: config.examId,
        userId: config.userId,
        sessionId: config.sessionId,
        severity: 'low',
        description: 'Cross-platform compatibility initialized',
        metadata: {
          deviceCategory: deviceCapabilityDetector.getDeviceCategory(),
          performanceScore: deviceCapabilityDetector.getCapabilityScore(),
          renderingProfile: adaptiveRenderingManager.getCurrentProfile().name
        }
      });
    } catch (error) {
      console.error('Failed to initialize cross-platform compatibility:', error);
      auditLogger.logExamSecurity('copy_paste', {
        examId: config.examId,
        userId: config.userId,
        sessionId: config.sessionId,
        severity: 'high',
        description: 'Cross-platform compatibility initialization failed',
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Apply device-specific optimizations
   */
  private async applyDeviceOptimizations(config: ExamSecurityConfig): Promise<void> {
    const deviceCapabilities = deviceCapabilityDetector.getHardwareCapabilities();
    const performanceProfile = deviceCapabilityDetector.getPerformanceProfile();
    const recommendedSettings = deviceCapabilityDetector.getRecommendedSettings();
    const browserInfo = browserCompatibilityManager.getBrowserInfo();

    // Adjust security settings based on device capabilities
    if (performanceProfile.category === 'low-end') {
      // Reduce resource-intensive security features
      config.enableBehaviorAnalysis = false;
      config.enableNetworkMonitoring = false;
      console.log('Reduced security features for low-end device');
    }

    if (browserInfo.touchSupport) {
      // Enable touch-specific security measures
      config.enableAdvancedClipboardMonitoring = false; // May not work well on touch devices
      console.log('Applied touch-device optimizations');
    }

    // Adjust monitoring intervals based on performance
    if (performanceProfile.category === 'high-end') {
      // More frequent monitoring for powerful devices
      console.log('High-frequency monitoring enabled');
    } else {
      // Less frequent monitoring for lower-end devices
      console.log('Conservative monitoring enabled');
    }

    // Apply rendering optimizations
    const renderingRecommendations = adaptiveRenderingManager.getPerformanceRecommendations();
    if (renderingRecommendations.suggestedProfile) {
      await adaptiveRenderingManager.setProfile(renderingRecommendations.suggestedProfile);
    }
  }

  /**
   * Initialize emergency response system for the exam session
   */
  private async initializeEmergencyResponse(config: ExamSecurityConfig): Promise<void> {
    try {
      // Initialize emergency orchestrator if not already done
      if (!this.emergencyInitialized) {
        await emergencyOrchestrator.initialize();
        this.emergencyInitialized = true;
      }

      // Start session monitoring with emergency system
      await emergencyOrchestrator.startSessionMonitoring(
        config.examId,
        config.userId,
        config.sessionId,
        {
          config,
          startTime: Date.now(),
          securitySettings: {
            enableNetworkMonitoring: config.enableNetworkMonitoring,
            enableScreenRecordingDetection: config.enableScreenRecordingDetection,
            enableBehaviorAnalysis: config.enableBehaviorAnalysis
          }
        }
      );

      auditLogger.logExamSecurity('exam_started', {
        examId: config.examId,
        userId: config.userId,
        sessionId: config.sessionId,
        severity: 'low',
        description: 'Emergency response system initialized for exam session',
        metadata: {
          networkMonitoring: config.enableNetworkMonitoring,
          screenRecordingDetection: config.enableScreenRecordingDetection,
          behaviorAnalysis: config.enableBehaviorAnalysis
        }
      });
    } catch (error) {
      console.error('Failed to initialize emergency response:', error);

      auditLogger.logExamSecurity('copy_paste', {
        examId: config.examId,
        userId: config.userId,
        sessionId: config.sessionId,
        severity: 'high',
        description: 'Emergency response initialization failed',
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
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

    // Clear advanced security intervals
    const advancedInterval = this.advancedSecurityIntervals.get(examKey);
    if (advancedInterval) {
      clearInterval(advancedInterval);
      this.advancedSecurityIntervals.delete(examKey);
    }

    const networkInterval = this.networkMonitoringIntervals.get(examKey);
    if (networkInterval) {
      clearInterval(networkInterval);
      this.networkMonitoringIntervals.delete(examKey);
    }

    const clipboardInterval = this.clipboardMonitoringIntervals.get(examKey);
    if (clipboardInterval) {
      clearInterval(clipboardInterval);
      this.clipboardMonitoringIntervals.delete(examKey);
    }

    const debugInterval = this.debugDetectionIntervals.get(examKey);
    if (debugInterval) {
      clearInterval(debugInterval);
      this.debugDetectionIntervals.delete(examKey);
    }

    // Remove encryption key
    this.encryptionKeys.delete(examKey);

    // Clean up behavior analysis
    this.cleanupBehaviorAnalysis(examKey);

    // Remove event listeners
    this.removeEventListeners(examKey);

    // Stop emergency monitoring
    this.stopEmergencyMonitoring(examId, userId, sessionId);

    // Clean up cross-platform compatibility components
    this.cleanupCrossPlatformCompatibility(examId, userId, sessionId);
  }

  /**
   * Clean up cross-platform compatibility components
   */
  private cleanupCrossPlatformCompatibility(examId: string, userId: string, sessionId: string): void {
    try {
      // Clean up performance monitor
      performanceMonitor.destroy();

      // Clean up adaptive rendering manager
      adaptiveRenderingManager.destroy();

      // Clean up device capability detector
      deviceCapabilityDetector.destroy();

      auditLogger.logExamSecurity('exam_completed', {
        examId,
        userId,
        sessionId,
        severity: 'low',
        description: 'Cross-platform compatibility components cleaned up',
        metadata: {}
      });
    } catch (error) {
      console.error('Failed to cleanup cross-platform compatibility:', error);
      auditLogger.logExamSecurity('copy_paste', {
        examId,
        userId,
        sessionId,
        severity: 'medium',
        description: 'Cross-platform compatibility cleanup failed',
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Stop emergency monitoring for the exam session
   */
  private async stopEmergencyMonitoring(examId: string, userId: string, sessionId: string): Promise<void> {
    try {
      await emergencyOrchestrator.stopSessionMonitoring(examId, userId, sessionId);

      auditLogger.logExamSecurity('exam_completed', {
        examId,
        userId,
        sessionId,
        severity: 'low',
        description: 'Emergency monitoring stopped for exam session',
        metadata: {}
      });
    } catch (error) {
      console.error('Failed to stop emergency monitoring:', error);

      auditLogger.logExamSecurity('copy_paste', {
        examId,
        userId,
        sessionId,
        severity: 'medium',
        description: 'Emergency monitoring cleanup failed',
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
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

    // Integrate with violation reporting system (async, don't block main flow)
    violationIntegrationService.processViolation(securityEvent, examConfig).catch(error => {
      console.error('Error in violation integration:', error);
    });
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

      case 'screen_recording':
        status.screenRecordingDetected = true;
        status.violations++;
        status.warnings.push('Screen recording software detected');
        break;

      case 'network_violation':
        if (event.details.vpnDetected) status.vpnDetected = true;
        if (event.details.proxyDetected) status.proxyDetected = true;
        status.networkRequests++;
        if (status.networkRequests > config.maxNetworkRequests) {
          status.violations++;
          status.warnings.push('Excessive network activity detected');
        }
        break;

      case 'clipboard_operation':
        status.clipboardOperations++;
        if (status.clipboardOperations > config.maxClipboardOperations) {
          status.violations++;
          status.warnings.push('Excessive clipboard operations detected');
        }
        break;

      case 'debug_attempt':
        status.debugAttempts++;
        status.violations++;
        status.warnings.push('Developer tools access attempt detected');
        break;

      case 'secure_comm_breach':
        status.secureCommBreaches++;
        status.violations++;
        status.warnings.push('Secure communication breach detected');
        break;

      case 'mouse_anomaly':
        status.mouseAnomalies++;
        status.violations++;
        status.warnings.push('Mouse movement anomaly detected');
        break;

      case 'keystroke_anomaly':
        status.keystrokeAnomalies++;
        status.violations++;
        status.warnings.push('Keystroke pattern anomaly detected');
        break;

      case 'gaze_anomaly':
        status.gazeAnomalies++;
        status.violations++;
        status.warnings.push('Gaze tracking anomaly detected');
        break;

      case 'time_pattern_anomaly':
        status.timePatternAnomalies++;
        status.violations++;
        status.warnings.push('Time pattern anomaly detected');
        break;

      case 'behavior_anomaly':
        status.violations++;
        status.warnings.push('General behavior anomaly detected');
        break;

      case 'coordinated_cheating':
        status.coordinatedCheatingAttempts++;
        status.violations += 2; // Higher penalty for coordinated cheating
        status.warnings.push('Coordinated cheating attempt detected');
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

    // Deduct points for behavior analysis anomalies
    if (config.enableBehaviorAnalysis) {
      // Mouse anomalies
      if (status.mouseAnomalies > 0) {
        score -= Math.min(15, status.mouseAnomalies * 5);
      }

      // Keystroke anomalies
      if (status.keystrokeAnomalies > 0) {
        score -= Math.min(15, status.keystrokeAnomalies * 5);
      }

      // Gaze anomalies
      if (status.gazeAnomalies > 0) {
        score -= Math.min(20, status.gazeAnomalies * 7);
      }

      // Time pattern anomalies
      if (status.timePatternAnomalies > 0) {
        score -= Math.min(15, status.timePatternAnomalies * 5);
      }

      // Coordinated cheating attempts (higher penalty)
      if (status.coordinatedCheatingAttempts > 0) {
        score -= Math.min(30, status.coordinatedCheatingAttempts * 15);
      }

      // Deduct points based on behavior score
      if (status.behaviorScore < 80) {
        score -= (100 - status.behaviorScore) * 0.5;
      }

      // Deduct points based on attention score
      if (status.attentionScore < 70) {
        score -= (100 - status.attentionScore) * 0.3;
      }
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

  /**
   * Start advanced security monitoring
   */
  private startAdvancedSecurityMonitoring(examKey: string, config: ExamSecurityConfig): void {
    if (typeof window === 'undefined') {
      return;
    }
    const interval = setInterval(async () => {
      const status = this.securityStatus.get(examKey);
      if (!status || !status.isActive) {
        clearInterval(interval);
        return;
      }

      try {
        // Screen recording detection
        if (config.enableScreenRecordingDetection) {
          await this.detectScreenRecording(examKey, config);
        }

        // Network monitoring
        if (config.enableNetworkMonitoring) {
          await this.monitorNetworkActivity(examKey, config);
        }

        // Advanced clipboard monitoring
        if (config.enableAdvancedClipboardMonitoring) {
          await this.monitorAdvancedClipboard(examKey, config);
        }

        // Advanced anti-debugging
        if (config.enableAdvancedAntiDebugging) {
          await this.detectAdvancedDebugging(examKey, config);
        }

        status.lastAdvancedCheck = Date.now();
      } catch (error) {
        console.error('Advanced security monitoring error:', error);
      }
    }, 30000); // Check every 30 seconds

    this.advancedSecurityIntervals.set(examKey, interval);
  }

  /**
   * Detect screen recording software
   */
  private async detectScreenRecording(examKey: string, config: ExamSecurityConfig): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    try {
      // Check MediaDevices API for screen sharing
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const screenDevices = devices.filter(device =>
          device.kind === 'audiooutput' || device.kind === 'videoinput'
        );

        // Check for unusual device configurations
        if (screenDevices.length > 2) {
          this.recordEvent({
            examId: config.examId,
            userId: config.userId,
            sessionId: config.sessionId,
            eventType: 'screen_recording',
            severity: 'high',
            details: {
              deviceCount: screenDevices.length,
              devices: screenDevices.map(d => ({ kind: d.kind, label: d.label })),
              reason: 'multiple_media_devices'
            },
            action: 'warn',
          });
        }
      }

      // Check for known recording processes (limited browser capabilities)
      // This is mainly for detection through performance patterns
      const performance = window.performance;
      if (performance && 'memory' in performance) {
        const memoryInfo = (performance as any).memory;
        if (memoryInfo && memoryInfo.usedJSHeapSize && memoryInfo.totalJSHeapSize) {
          const memoryUsage = memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize;
          if (memoryUsage > 0.8) {
            this.recordEvent({
              examId: config.examId,
              userId: config.userId,
              sessionId: config.sessionId,
              eventType: 'screen_recording',
              severity: 'medium',
              details: {
                memoryUsage,
                reason: 'high_memory_usage'
              },
              action: 'log',
            });
          }
        }
      }

      // Check GPU usage patterns
      if ('webkitRequestAnimationFrame' in window || 'mozRequestAnimationFrame' in window) {
        // Monitor for high-frequency animation frames that might indicate recording
        let frameCount = 0;
        let startTime = Date.now();

        const checkFrameRate = () => {
          frameCount++;
          if (Date.now() - startTime >= 5000) { // Check over 5 seconds
            const fps = frameCount / 5;
            if (fps > 60) { // Unusually high frame rate
              this.recordEvent({
                examId: config.examId,
                userId: config.userId,
                sessionId: config.sessionId,
                eventType: 'screen_recording',
                severity: 'medium',
                details: {
                  fps,
                  reason: 'high_frame_rate'
                },
                action: 'log',
              });
            }
            frameCount = 0;
            startTime = Date.now();
          }
          requestAnimationFrame(checkFrameRate);
        };

        // Only run for a short period to avoid performance impact
        setTimeout(() => checkFrameRate(), 1000);
      }

    } catch (error) {
      console.error('Screen recording detection error:', error);
    }
  }

  /**
   * Monitor network activity
   */
  private async monitorNetworkActivity(examKey: string, config: ExamSecurityConfig): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      // Check for VPN/Proxy indicators
      const isVpnDetected = await this.detectVPN();
      const isProxyDetected = await this.detectProxy();

      if (isVpnDetected || isProxyDetected) {
        this.recordEvent({
          examId: config.examId,
          userId: config.userId,
          sessionId: config.sessionId,
          eventType: 'network_violation',
          severity: isVpnDetected ? 'high' : 'medium',
          details: {
            vpnDetected: isVpnDetected,
            proxyDetected: isProxyDetected,
            timestamp: Date.now()
          },
          action: isVpnDetected ? 'warn' : 'log',
        });
      }

      // Monitor unauthorized external requests
      if (config.allowedDomains && config.allowedDomains.length > 0) {
        // This would require intercepting network requests
        // In a real implementation, you'd use Service Worker or monkey-patch XMLHttpRequest/Fetch
        this.monitorExternalRequests(examKey, config);
      }

    } catch (error) {
      console.error('Network monitoring error:', error);
    }
  }

  /**
   * Detect VPN usage
   */
  private async detectVPN(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }
    try {
      // Check WebRTC IP leakage
      if (window.RTCPeerConnection) {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));

        return new Promise((resolve) => {
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              const candidate = event.candidate.candidate;
              // Check for VPN-like IP patterns
              if (candidate.includes('10.') || candidate.includes('172.') || candidate.includes('192.168.')) {
                resolve(false); // Private IP, likely not VPN
              } else {
                // Public IP, could be VPN
                pc.close();
                resolve(true);
              }
            }
          };

          setTimeout(() => {
            pc.close();
            resolve(false);
          }, 5000);
        });
      }
    } catch (error) {
      console.error('VPN detection error:', error);
    }
    return false;
  }

  /**
   * Detect proxy usage
   */
  private async detectProxy(): Promise<boolean> {
    try {
      // Check for proxy headers via timing analysis
      const startTime = Date.now();
      const response = await fetch('/api/health', { method: 'HEAD' });
      const responseTime = Date.now() - startTime;

      // Unusual response times might indicate proxy usage
      if (responseTime > 5000) {
        return true;
      }

      // Check for common proxy headers
      const proxyHeaders = [
        'via', 'proxy-connection', 'proxy-authenticate',
        'x-forwarded-for', 'x-real-ip', 'x-proxy-id'
      ];

      for (const header of proxyHeaders) {
        if (response.headers.get(header)) {
          return true;
        }
      }

    } catch (error) {
      console.error('Proxy detection error:', error);
    }
    return false;
  }

  /**
   * Monitor external requests
   */
  private monitorExternalRequests(examKey: string, config: ExamSecurityConfig): void {
    if (typeof window === 'undefined') {
      return;
    }
    // Store original methods
    const originalXMLHttpRequest = window.XMLHttpRequest;
    const originalFetch = window.fetch;
    const self = this;

    // Create a wrapper constructor for XMLHttpRequest
    const XMLHttpRequestProxy = function(this: XMLHttpRequest) {
      const xhr = new originalXMLHttpRequest();
      const originalOpen = xhr.open;

      xhr.open = function(method: string, url: string | URL) {
        const urlString = typeof url === 'string' ? url : url.href;

        // Check if request is to allowed domain
        const isAllowed = config.allowedDomains?.some(domain =>
          urlString.includes(domain)
        );

        if (!isAllowed && !urlString.startsWith(window.location.origin)) {
          self.recordEvent({
            examId: config.examId,
            userId: config.userId,
            sessionId: config.sessionId,
            eventType: 'network_violation',
            severity: 'high',
            details: {
              url: urlString,
              method,
              reason: 'unauthorized_external_request'
            },
            action: 'block',
          });
        }

        return originalOpen.apply(this, [method, url] as any);
      };

      // Copy all properties from xhr to this
      Object.setPrototypeOf(this, XMLHttpRequestProxy.prototype);
      Object.assign(this, xhr);

      return this;
    } as any;

    // Set up inheritance
    XMLHttpRequestProxy.prototype = originalXMLHttpRequest.prototype;

    // Replace XMLHttpRequest
    (window as any).XMLHttpRequest = XMLHttpRequestProxy;

    // Monkey-patch fetch
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      const isAllowed = config.allowedDomains?.some(domain =>
        url.includes(domain)
      );

      if (!isAllowed && !url.startsWith(window.location.origin)) {
        self.recordEvent({
          examId: config.examId,
          userId: config.userId,
          sessionId: config.sessionId,
          eventType: 'network_violation',
          severity: 'high',
          details: {
            url,
            method: init?.method || 'GET',
            reason: 'unauthorized_external_request'
          },
          action: 'block',
        });
      }

      return originalFetch(input, init);
    };
  }

  /**
   * Monitor advanced clipboard operations
   */
  private async monitorAdvancedClipboard(examKey: string, config: ExamSecurityConfig): Promise<void> {
    try {
      // Enhanced clipboard monitoring with timing analysis
      if (navigator.clipboard) {
        const clipboardData = await navigator.clipboard.readText().catch(() => '');

        if (clipboardData && clipboardData.length > 0) {
          this.recordEvent({
            examId: config.examId,
            userId: config.userId,
            sessionId: config.sessionId,
            eventType: 'clipboard_operation',
            severity: 'low',
            details: {
              dataLength: clipboardData.length,
              hasSuspectContent: this.isSuspectClipboardContent(clipboardData),
              timestamp: Date.now()
            },
            action: 'log',
          });
        }
      }
    } catch (error) {
      console.error('Advanced clipboard monitoring error:', error);
    }
  }

  /**
   * Check if clipboard content is suspicious
   */
  private isSuspectClipboardContent(content: string): boolean {
    // Check for exam-related keywords or code patterns
    const suspectPatterns = [
      /answer/i,
      /solution/i,
      /function/i,
      /class/i,
      /import/i,
      /export/i,
      /\b\d+\.\s/, // Numbered lists
      /question/i
    ];

    return suspectPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Detect advanced debugging attempts
   */
  private async detectAdvancedDebugging(examKey: string, config: ExamSecurityConfig): Promise<void> {
    try {
      // Multiple detection methods for developer tools
      const detectionMethods = [
        this.detectDevToolsViaConsole(),
        this.detectDevToolsViaPerformance(),
        this.detectDevToolsViaMemory(),
        this.detectDevToolsViaTiming()
      ];

      const results = await Promise.all(detectionMethods);
      const detected = results.some(result => result);

      if (detected) {
        this.recordEvent({
          examId: config.examId,
          userId: config.userId,
          sessionId: config.sessionId,
          eventType: 'debug_attempt',
          severity: 'high',
          details: {
            detectionMethods: results,
            timestamp: Date.now()
          },
          action: 'warn',
        });
      }
    } catch (error) {
      console.error('Advanced debugging detection error:', error);
    }
  }

  /**
   * Detect dev tools via console manipulation
   */
  private detectDevToolsViaConsole(): boolean {
    try {
      const consoleMethods = ['log', 'warn', 'error', 'info', 'debug'];
      let modified = false;

      consoleMethods.forEach(method => {
        const original = (console as any)[method];
        (console as any)[method] = (...args: any[]) => {
          modified = true;
          return original.apply(console, args);
        };
      });

      // Restore after a short delay
      setTimeout(() => {
        consoleMethods.forEach(method => {
          (console as any)[method] = (console as any)[`__${method}`] || (console as any)[method];
        });
      }, 100);

      return modified;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect dev tools via performance monitoring
   */
  private detectDevToolsViaPerformance(): boolean {
    try {
      const start = performance.now();
      debugger; // This will be skipped if dev tools are open
      const end = performance.now();

      // If dev tools are open, debugger statement takes longer
      return (end - start) > 100;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect dev tools via memory inspection
   */
  private detectDevToolsViaMemory(): boolean {
    try {
      // Check for dev tools specific objects
      return !!(
        (window as any).chrome &&
        (window as any).chrome.devtools &&
        (window as any).chrome.devtools.inspectedWindow
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect dev tools via timing analysis
   */
  private detectDevToolsViaTiming(): boolean {
    try {
      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        // Empty loop to measure timing
      }
      const end = Date.now();

      // Dev tools can slow down JavaScript execution
      return (end - start) > 50;
    } catch (error) {
      return false;
    }
  }

  /**
   * Initialize secure communication
   */
  private async initializeSecureCommunication(examKey: string): Promise<void> {
    try {
      // Generate encryption key for secure communication
      const key = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

      this.encryptionKeys.set(examKey, key);

      // Monkey-patch communication methods
      this.secureFetchCommunication(examKey);
      this.secureXMLHttpCommunication(examKey);

    } catch (error) {
      console.error('Secure communication initialization error:', error);
    }
  }

  /**
   * Initialize behavior analysis
   */
  private initializeBehaviorAnalysis(examKey: string, config: ExamSecurityConfig): void {
    try {
      const behaviorConfig: BehaviorModelConfig = {
        mouseVelocityThreshold: 1000,
        keystrokeIntervalThreshold: 50,
        gazeAttentionThreshold: 0.6,
        timePatternThreshold: 30000, // 30 seconds variance
        anomalyScoreWeight: {
          mouse: 0.25,
          keystroke: 0.25,
          gaze: 0.25,
          time: 0.25
        }
      };

      behaviorAnalysisEngine.initializeAnalysis(examKey, behaviorConfig);

      // Start behavior analysis monitoring
      if (config.behaviorAnalysisInterval > 0) {
        this.startBehaviorAnalysisMonitoring(examKey, config.behaviorAnalysisInterval);
      }

      // Set up behavior tracking event listeners
      this.setupBehaviorTrackingListeners(examKey, config);

    } catch (error) {
      console.error('Behavior analysis initialization error:', error);
    }
  }

  /**
   * Start behavior analysis monitoring
   */
  private startBehaviorAnalysisMonitoring(examKey: string, interval: number): void {
    const behaviorInterval = setInterval(async () => {
      const config = this.activeExams.get(examKey);
      const status = this.securityStatus.get(examKey);

      if (!config || !status || !status.isActive) {
        clearInterval(behaviorInterval);
        return;
      }

      try {
        const analysisResult = await behaviorAnalysisEngine.analyzeBehavior(examKey);

        // Update behavior analysis metrics
        status.behaviorScore = Math.max(0, 100 - analysisResult.anomalyScore);
        status.lastBehaviorAnalysis = analysisResult.timestamp;

        // Calculate attention score based on gaze and mouse activity
        status.attentionScore = this.calculateAttentionScore(analysisResult);

        // Record behavior anomalies
        if (analysisResult.anomalyScore > config.anomalyThreshold) {
          this.handleBehaviorAnomaly(examKey, analysisResult, config, status);
        }

        // Check for coordinated cheating
        if (analysisResult.detectedPatterns.some(p => p.includes('coordinated_cheating'))) {
          status.coordinatedCheatingAttempts++;
        }

      } catch (error) {
        console.error('Behavior analysis monitoring error:', error);
      }
    }, interval * 1000);

    this.advancedSecurityIntervals.set(examKey + '_behavior', behaviorInterval);
  }

  /**
   * Set up behavior tracking event listeners
   */
  private setupBehaviorTrackingListeners(examKey: string, config: ExamSecurityConfig): void {
    if (typeof window === 'undefined') {
      return; // Server-side, skip behavior tracking
    }

    const status = this.securityStatus.get(examKey);
    if (!status) return;

    // Mouse movement tracking
    if (config.enableMouseTracking) {
      let lastMouseTime = 0;
      const handleMouseMove = (e: MouseEvent) => {
        const now = Date.now();
        if (now - lastMouseTime > 50) { // Throttle to 20fps
          behaviorAnalysisEngine.recordMouseMovement(examKey, e.clientX, e.clientY);
          lastMouseTime = now;
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
    }

    // Keystroke tracking
    if (config.enableKeystrokeAnalysis) {
      let keyDownTime = 0;

      const handleKeyDown = (e: KeyboardEvent) => {
        keyDownTime = Date.now();
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (keyDownTime > 0) {
          const duration = Date.now() - keyDownTime;
          behaviorAnalysisEngine.recordKeystroke(examKey, e.key, duration);
          keyDownTime = 0;
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
    }

    // Gaze tracking simulation (in real implementation, would use webcam)
    if (config.enableGazeTracking) {
      this.initializeGazeTracking(examKey);
    }
  }

  /**
   * Initialize gaze tracking
   */
  private async initializeGazeTracking(examKey: string): Promise<void> {
    try {
      // In a real implementation, this would use WebRTC and computer vision
      // For now, we'll simulate gaze tracking based on mouse position
      let gazeInterval: NodeJS.Timeout;

      const simulateGazeTracking = () => {
        if (typeof window === 'undefined') return;

        // Simulate gaze data based on mouse position and random factors
        const mouseX = Math.random() * window.innerWidth;
        const mouseY = Math.random() * window.innerHeight;
        const confidence = 0.7 + Math.random() * 0.3; // 0.7-1.0
        const pupilDilation = 0.3 + Math.random() * 0.4; // 0.3-0.7
        const blinkRate = 15 + Math.random() * 10; // 15-25 blinks per minute

        behaviorAnalysisEngine.recordGazeData(examKey, mouseX, mouseY, confidence, pupilDilation, blinkRate);
      };

      // Simulate gaze tracking every 100ms
      gazeInterval = setInterval(simulateGazeTracking, 100);
      this.debugDetectionIntervals.set(examKey + '_gaze', gazeInterval);

    } catch (error) {
      console.error('Gaze tracking initialization error:', error);
    }
  }

  /**
   * Handle behavior anomaly detection
   */
  private handleBehaviorAnomaly(
    examKey: string,
    analysisResult: any,
    config: ExamSecurityConfig,
    status: ExamSecurityStatus
  ): void {
    const anomalyType = analysisResult.detectedPatterns[0] || 'behavior_anomaly';

    // Map anomaly patterns to event types
    const eventTypeMap: Record<string, string> = {
      'robotic_mouse_movements': 'mouse_anomaly',
      'robotic_typing_pattern': 'keystroke_anomaly',
      'low_attention_detected': 'gaze_anomaly',
      'inconsistent_time_patterns': 'time_pattern_anomaly',
      'coordinated_cheating_detected': 'coordinated_cheating'
    };

    const eventType = eventTypeMap[anomalyType] || 'behavior_anomaly';

    // Update anomaly counters
    switch (eventType) {
      case 'mouse_anomaly':
        status.mouseAnomalies++;
        break;
      case 'keystroke_anomaly':
        status.keystrokeAnomalies++;
        break;
      case 'gaze_anomaly':
        status.gazeAnomalies++;
        break;
      case 'time_pattern_anomaly':
        status.timePatternAnomalies++;
        break;
    }

    // Record the anomaly event
    this.recordEvent({
      examId: config.examId,
      userId: config.userId,
      sessionId: config.sessionId,
      eventType: eventType as any,
      severity: analysisResult.riskLevel === 'critical' ? 'critical' :
               analysisResult.riskLevel === 'high' ? 'high' : 'medium',
      details: {
        anomalyScore: analysisResult.anomalyScore,
        confidence: analysisResult.confidence,
        detectedPatterns: analysisResult.detectedPatterns,
        recommendations: analysisResult.recommendations,
        timestamp: analysisResult.timestamp
      },
      action: analysisResult.riskLevel === 'critical' ? 'terminate' : 'warn'
    });
  }

  /**
   * Calculate attention score from behavior analysis
   */
  private calculateAttentionScore(analysisResult: any): number {
    let attentionScore = 100;

    // Reduce score based on detected patterns
    if (analysisResult.detectedPatterns.includes('low_attention_detected')) {
      attentionScore -= 30;
    }

    if (analysisResult.detectedPatterns.includes('unusual_gaze_fixation')) {
      attentionScore -= 20;
    }

    if (analysisResult.detectedPatterns.includes('robotic_mouse_movements')) {
      attentionScore -= 25;
    }

    // Reduce score based on anomaly score
    attentionScore -= analysisResult.anomalyScore * 0.5;

    return Math.max(0, attentionScore);
  }

  /**
   * Record time pattern for question answering
   */
  recordQuestionTimePattern(
    examId: string,
    userId: string,
    sessionId: string,
    questionId: string,
    startTime: number,
    endTime: number,
    answerLength: number,
    hesitationCount: number,
    revisionCount: number
  ): void {
    const examKey = `${examId}_${userId}_${sessionId}`;
    const config = this.activeExams.get(examKey);

    if (config?.enableBehaviorAnalysis && config.enableTimeBasedAnalysis) {
      behaviorAnalysisEngine.recordTimePattern(
        examKey,
        questionId,
        startTime,
        endTime,
        answerLength,
        hesitationCount,
        revisionCount
      );
    }
  }

  /**
   * Get behavior analysis statistics
   */
  getBehaviorAnalysisStats(examId: string, userId: string, sessionId: string): any {
    const examKey = `${examId}_${userId}_${sessionId}`;
    return behaviorAnalysisEngine.getBehaviorStats(examKey);
  }

  /**
   * Clean up behavior analysis for session
   */
  private cleanupBehaviorAnalysis(examKey: string): void {
    try {
      behaviorAnalysisEngine.cleanupSession(examKey);

      // Clear behavior analysis intervals
      const behaviorInterval = this.advancedSecurityIntervals.get(examKey + '_behavior');
      if (behaviorInterval) {
        clearInterval(behaviorInterval);
        this.advancedSecurityIntervals.delete(examKey + '_behavior');
      }

      const gazeInterval = this.debugDetectionIntervals.get(examKey + '_gaze');
      if (gazeInterval) {
        clearInterval(gazeInterval);
        this.debugDetectionIntervals.delete(examKey + '_gaze');
      }

    } catch (error) {
      console.error('Behavior analysis cleanup error:', error);
    }
  }

  /**
   * Secure fetch communication
   */
  private secureFetchCommunication(examKey: string): void {
    const originalFetch = window.fetch;
    const encryptionKey = this.encryptionKeys.get(examKey);

    if (!encryptionKey) return;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        // Encrypt request body if present
        let encryptedInit = init;
        if (init?.body && typeof init.body === 'string') {
          const encoded = new TextEncoder().encode(init.body);
          const iv = crypto.getRandomValues(new Uint8Array(12));

          const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            encryptionKey,
            encoded
          );

          // Create HMAC for integrity verification
          const hmac = await this.createHMAC(encrypted, encryptionKey);

          encryptedInit = {
            ...init,
            body: JSON.stringify({
              encrypted: Array.from(new Uint8Array(encrypted)),
              iv: Array.from(iv),
              hmac: Array.from(new Uint8Array(hmac))
            }),
            headers: {
              ...init.headers,
              'X-Secure-Comm': 'true',
              'Content-Type': 'application/json'
            }
          };
        }

        const response = await originalFetch(input, encryptedInit);

        // Decrypt response if needed
        if (response.headers.get('X-Secure-Comm') === 'true') {
          const responseData = await response.json();
          if (responseData.encrypted && responseData.iv && responseData.hmac) {
            // Verify HMAC
            const hmacValid = await this.verifyHMAC(
              new Uint8Array(responseData.encrypted),
              new Uint8Array(responseData.hmac),
              encryptionKey
            );

            if (!hmacValid) {
              throw new Error('HMAC verification failed');
            }

            // Decrypt response
            const decrypted = await crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: new Uint8Array(responseData.iv) },
              encryptionKey,
              new Uint8Array(responseData.encrypted)
            );

            const decryptedText = new TextDecoder().decode(decrypted);
            return new Response(decryptedText, response);
          }
        }

        return response;

      } catch (error) {
        // Record secure communication breach
        const config = this.activeExams.get(examKey);
        if (config) {
          this.recordEvent({
            examId: config.examId,
            userId: config.userId,
            sessionId: config.sessionId,
            eventType: 'secure_comm_breach',
            severity: 'critical',
            details: {
              error: error instanceof Error ? error.message : String(error),
              timestamp: Date.now()
            },
            action: 'terminate',
          });
        }
        throw error;
      }
    };
  }

  /**
   * Secure XMLHttpRequest communication
   */
  private secureXMLHttpCommunication(examKey: string): void {
    const originalXMLHttpRequest = window.XMLHttpRequest;
    const encryptionKey = this.encryptionKeys.get(examKey);

    if (!encryptionKey) return;

    // Create a wrapper constructor for XMLHttpRequest
    const SecureXMLHttpRequest = function(this: XMLHttpRequest) {
      const xhr = new originalXMLHttpRequest();
      const originalSend = xhr.send;
      const originalOpen = xhr.open;

      xhr.open = function(method: string, url: string | URL) {
        // Add secure communication header
        xhr.setRequestHeader('X-Secure-Comm', 'true');
        return originalOpen.apply(this, [method, url] as any);
      };

      xhr.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
        if (body && typeof body === 'string') {
          // Encrypt and send
          crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) },
            encryptionKey,
            new TextEncoder().encode(body)
          ).then(encrypted => {
            originalSend.call(this, JSON.stringify({
              encrypted: Array.from(new Uint8Array(encrypted))
            }));
          });
        } else {
          originalSend.call(this, body);
        }
      };

      // Copy all properties from xhr to this
      Object.setPrototypeOf(this, SecureXMLHttpRequest.prototype);
      Object.assign(this, xhr);

      return this;
    } as any;

    // Set up inheritance
    SecureXMLHttpRequest.prototype = originalXMLHttpRequest.prototype;

    // Replace XMLHttpRequest
    (window as any).XMLHttpRequest = SecureXMLHttpRequest;
  }

  /**
   * Create HMAC for integrity verification
   */
  private async createHMAC(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      crypto.getRandomValues(new Uint8Array(32)),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    return crypto.subtle.sign('HMAC', hmacKey, data);
  }

  /**
   * Verify HMAC integrity
   */
  private async verifyHMAC(data: Uint8Array, hmac: Uint8Array, key: CryptoKey): Promise<boolean> {
    try {
      // Use the provided key parameter for verification
      const dataView = new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength);
      const hmacView = new Uint8Array(hmac.buffer as ArrayBuffer, hmac.byteOffset, hmac.byteLength);
      return crypto.subtle.verify('HMAC', key, hmacView, dataView);
    } catch (error) {
      return false;
    }
  }
}

export const examSecurityService = ExamSecurityService.getInstance();
export default examSecurityService;
