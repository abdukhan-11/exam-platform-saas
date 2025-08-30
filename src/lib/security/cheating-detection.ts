import { db } from '@/lib/db';
import { getRedisCache } from '@/lib/cache/redis-cache';
import { ExamMonitoringData, CheatingAlert } from '@/lib/types/exam-monitoring';

export interface CheatingPattern {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detector: (activity: ExamMonitoringData, context: ActivityContext) => boolean;
  cooldownMinutes: number;
}

export interface ActivityContext {
  examId: string;
  userId: string;
  sessionStartTime: Date;
  previousActivities: ExamMonitoringData[];
  userStats: {
    averageResponseTime: number;
    tabSwitches: number;
    copyPasteAttempts: number;
    windowFocusChanges: number;
  };
}

export interface DetectionResult {
  isCheating: boolean;
  alert?: CheatingAlert;
  confidence: number;
  patterns: string[];
}

/**
 * Cheating Detection Service - Analyzes student activity for suspicious behavior
 */
export class CheatingDetectionService {
  private static instance: CheatingDetectionService;
  private redis = getRedisCache();
  private patterns: CheatingPattern[] = [];
  private alertCooldowns = new Map<string, Date>();

  private constructor() {
    this.initializePatterns();
  }

  static getInstance(): CheatingDetectionService {
    if (!CheatingDetectionService.instance) {
      CheatingDetectionService.instance = new CheatingDetectionService();
    }
    return CheatingDetectionService.instance;
  }

  /**
   * Initialize cheating detection patterns
   */
  private initializePatterns(): void {
    this.patterns = [
      {
        id: 'tab_switch',
        name: 'Tab/Window Switching',
        description: 'Student switched to another tab or window during exam',
        severity: 'medium',
        cooldownMinutes: 5,
        detector: (activity, context) => {
          return activity.action === 'visibility_change' &&
                 activity.data.hidden === true &&
                 activity.data.reason === 'tab_switch';
        }
      },
      {
        id: 'copy_paste_attempt',
        name: 'Copy/Paste Attempt',
        description: 'Student attempted to copy or paste content',
        severity: 'high',
        cooldownMinutes: 2,
        detector: (activity, context) => {
          return activity.action === 'clipboard_event' &&
                 (activity.data.type === 'copy' || activity.data.type === 'paste');
        }
      },
      {
        id: 'right_click',
        name: 'Right Click Usage',
        description: 'Student used right-click menu (potential cheating method)',
        severity: 'low',
        cooldownMinutes: 10,
        detector: (activity, context) => {
          return activity.action === 'context_menu' ||
                 (activity.action === 'mouse_event' && activity.data.button === 2);
        }
      },
      {
        id: 'dev_tools_open',
        name: 'Developer Tools Opened',
        description: 'Student opened browser developer tools',
        severity: 'critical',
        cooldownMinutes: 1,
        detector: (activity, context) => {
          return activity.action === 'dev_tools_opened' ||
                 activity.data.keyCombination === 'F12';
        }
      },
      {
        id: 'suspicious_timing',
        name: 'Suspicious Answer Timing',
        description: 'Student answered questions unusually fast',
        severity: 'medium',
        cooldownMinutes: 15,
        detector: (activity, context) => {
          if (activity.action !== 'question_answered') return false;

          const responseTime = Number((activity.data as any)?.timeSpent) || 0;
          const averageTime = context.userStats.averageResponseTime;

          // Flag if response is less than 10% of average time
          return averageTime > 0 && responseTime < (averageTime * 0.1);
        }
      },
      {
        id: 'excessive_tab_switches',
        name: 'Excessive Tab Switching',
        description: 'Student switched tabs more than allowed threshold',
        severity: 'high',
        cooldownMinutes: 10,
        detector: (activity, context) => {
          return activity.action === 'visibility_change' &&
                 context.userStats.tabSwitches > 5; // More than 5 switches in session
        }
      },
      {
        id: 'window_minimized',
        name: 'Window Minimized',
        description: 'Student minimized the exam window',
        severity: 'high',
        cooldownMinutes: 3,
        detector: (activity, context) => {
          return activity.action === 'visibility_change' &&
                 activity.data.reason === 'minimized';
        }
      },
      {
        id: 'suspicious_mouse_movement',
        name: 'Suspicious Mouse Movement',
        description: 'Mouse movement patterns suggest automated behavior',
        severity: 'medium',
        cooldownMinutes: 20,
        detector: (activity, context) => {
          if (activity.action !== 'mouse_movement') return false;

          const movement = activity.data;
          // Check for unnaturally smooth or robotic movement patterns
          return this.detectRoboticMouseMovement(movement);
        }
      },
      {
        id: 'multiple_answers_same_time',
        name: 'Multiple Questions Answered Simultaneously',
        description: 'Student appeared to answer multiple questions at the same time',
        severity: 'high',
        cooldownMinutes: 5,
        detector: (activity, context) => {
          if (activity.action !== 'bulk_answer') return false;

          const timeWindow = 2000; // 2 seconds
          const recentAnswers = context.previousActivities.filter(
            a => a.action === 'question_answered' &&
                 (activity.timestamp.getTime() - a.timestamp.getTime()) < timeWindow
          );

          return recentAnswers.length > 3; // More than 3 answers in 2 seconds
        }
      },
      {
        id: 'keyboard_shortcuts',
        name: 'Suspicious Keyboard Shortcuts',
        description: 'Student used keyboard shortcuts that could facilitate cheating',
        severity: 'medium',
        cooldownMinutes: 8,
        detector: (activity, context) => {
          const suspiciousShortcuts = [
            'Ctrl+A', 'Ctrl+C', 'Ctrl+V', 'Ctrl+Shift+I',
            'F12', 'Ctrl+Shift+C', 'Ctrl+U'
          ];

          return activity.action === 'keyboard_shortcut' &&
                 suspiciousShortcuts.includes(String((activity.data as any)?.combination));
        }
      }
    ];
  }

  /**
   * Analyze student activity for cheating patterns
   */
  async analyzeActivity(activity: ExamMonitoringData): Promise<CheatingAlert | null> {
    try {
      // Get activity context
      const context = await this.getActivityContext(activity);

      // Check all patterns
      const detectedPatterns: string[] = [];
      let highestSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let totalConfidence = 0;

      for (const pattern of this.patterns) {
        if (pattern.detector(activity, context)) {
          // Check cooldown
          const cooldownKey = `${activity.examId}_${activity.userId}_${pattern.id}`;
          const lastAlert = this.alertCooldowns.get(cooldownKey);

          if (!lastAlert || (Date.now() - lastAlert.getTime()) > (pattern.cooldownMinutes * 60 * 1000)) {
            detectedPatterns.push(pattern.id);

            if (this.getSeverityWeight(pattern.severity) > this.getSeverityWeight(highestSeverity)) {
              highestSeverity = pattern.severity;
            }

            totalConfidence += this.getSeverityWeight(pattern.severity);
          }
        }
      }

      if (detectedPatterns.length === 0) {
        return null;
      }

      // Calculate overall confidence
      const confidence = Math.min(totalConfidence / detectedPatterns.length, 1.0);

      // Create alert
      const alert: CheatingAlert = {
        examId: activity.examId,
        userId: activity.userId,
        alertType: detectedPatterns[0] as any, // Use first detected pattern as primary
        severity: highestSeverity,
        details: {
          patterns: detectedPatterns,
          confidence,
          activity,
          context,
          timestamp: activity.timestamp
        },
        timestamp: new Date()
      };

      // Update cooldowns
      for (const patternId of detectedPatterns) {
        const cooldownKey = `${activity.examId}_${activity.userId}_${patternId}`;
        this.alertCooldowns.set(cooldownKey, new Date());
      }

      // Store alert in database
      await this.storeAlert(alert);

      // Update student attempt record
      await this.updateSuspiciousActivity(activity.examId, activity.userId, alert);

      console.log(`🚨 Cheating alert for student ${activity.userId} in exam ${activity.examId}: ${detectedPatterns.join(', ')}`);

      return alert;

    } catch (error) {
      console.error('Error analyzing activity for cheating:', error);
      return null;
    }
  }

  /**
   * Get activity context for analysis
   */
  private async getActivityContext(activity: ExamMonitoringData): Promise<ActivityContext> {
    try {
      // Get session start time
      const attempt = await db.studentExamAttempt.findUnique({
        where: {
          userId_examId: {
            userId: activity.userId,
            examId: activity.examId
          }
        }
      });

      // Get recent activities from Redis
      const activitiesKey = `exam_activities_${activity.examId}_${activity.userId}`;
      const recentActivities = await this.redis.get(activitiesKey) as ExamMonitoringData[] || [];

      // Calculate user statistics
      const userStats = this.calculateUserStats(recentActivities);

      return {
        examId: activity.examId,
        userId: activity.userId,
        sessionStartTime: attempt?.startedAt || new Date(),
        previousActivities: recentActivities,
        userStats
      };

    } catch (error) {
      console.error('Error getting activity context:', error);
      // Return default context
      return {
        examId: activity.examId,
        userId: activity.userId,
        sessionStartTime: new Date(),
        previousActivities: [],
        userStats: {
          averageResponseTime: 0,
          tabSwitches: 0,
          copyPasteAttempts: 0,
          windowFocusChanges: 0
        }
      };
    }
  }

  /**
   * Calculate user statistics from recent activities
   */
  private calculateUserStats(activities: ExamMonitoringData[]): ActivityContext['userStats'] {
    const stats = {
      averageResponseTime: 0,
      tabSwitches: 0,
      copyPasteAttempts: 0,
      windowFocusChanges: 0
    };

    let totalResponseTime = 0;
    let answerCount = 0;

    for (const activity of activities) {
      switch (activity.action) {
        case 'question_answered':
          if (activity.data.timeSpent) {
            totalResponseTime += Number((activity.data as any)?.timeSpent) || 0;
            answerCount++;
          }
          break;

        case 'visibility_change':
          if (activity.data.reason === 'tab_switch') {
            stats.tabSwitches++;
          }
          stats.windowFocusChanges++;
          break;

        case 'clipboard_event':
          if (activity.data.type === 'copy' || activity.data.type === 'paste') {
            stats.copyPasteAttempts++;
          }
          break;
      }
    }

    stats.averageResponseTime = answerCount > 0 ? totalResponseTime / answerCount : 0;

    return stats;
  }

  /**
   * Detect robotic mouse movement patterns
   */
  private detectRoboticMouseMovement(movement: any): boolean {
    // Check for unnaturally straight lines, constant speed, or perfect curves
    if (!movement || !movement.points || movement.points.length < 3) {
      return false;
    }

    const points = movement.points;
    let straightLineCount = 0;
    let constantSpeedCount = 0;

    for (let i = 2; i < points.length; i++) {
      const p1 = points[i - 2];
      const p2 = points[i - 1];
      const p3 = points[i];

      // Check for straight lines (slope consistency)
      const slope1 = (p2.y - p1.y) / (p2.x - p1.x);
      const slope2 = (p3.y - p2.y) / (p3.x - p2.x);

      if (Math.abs(slope1 - slope2) < 0.01) { // Very similar slopes
        straightLineCount++;
      }

      // Check for constant speed (time intervals)
      const time1 = p2.timestamp - p1.timestamp;
      const time2 = p3.timestamp - p2.timestamp;

      if (Math.abs(time1 - time2) < 10) { // Very similar time intervals
        constantSpeedCount++;
      }
    }

    // Flag if too many straight lines or constant speeds
    const straightLineRatio = straightLineCount / (points.length - 2);
    const constantSpeedRatio = constantSpeedCount / (points.length - 2);

    return straightLineRatio > 0.8 || constantSpeedRatio > 0.9;
  }

  /**
   * Get severity weight for comparison
   */
  private getSeverityWeight(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    switch (severity) {
      case 'low': return 0.25;
      case 'medium': return 0.5;
      case 'high': return 0.75;
      case 'critical': return 1.0;
      default: return 0;
    }
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: CheatingAlert): Promise<void> {
    try {
      // Store in a cheating alerts table (would need to be created)
      const alertsKey = `cheating_alerts_${alert.examId}`;
      const existingAlerts = await this.redis.get(alertsKey) as CheatingAlert[] || [];
      existingAlerts.push(alert);

      // Keep only recent alerts (last 100)
      const recentAlerts = existingAlerts.slice(-100);
      await this.redis.set(alertsKey, recentAlerts, 60 * 60 * 24); // 24 hours

    } catch (error) {
      console.error('Error storing cheating alert:', error);
    }
  }

  /**
   * Update student attempt with suspicious activity
   */
  private async updateSuspiciousActivity(examId: string, userId: string, alert: CheatingAlert): Promise<void> {
    try {
      const attempt = await db.studentExamAttempt.findUnique({
        where: {
          userId_examId: { userId, examId }
        }
      });

      if (attempt) {
        const currentLog = attempt.activityLog ? JSON.parse(attempt.activityLog) : [];
        currentLog.push({
          type: 'cheating_alert',
          alert,
          timestamp: new Date()
        });

        await db.studentExamAttempt.update({
          where: {
            userId_examId: { userId, examId }
          },
          data: {
            suspiciousActivity: true,
            violationCount: { increment: 1 },
            activityLog: JSON.stringify(currentLog)
          }
        });
      }

    } catch (error) {
      console.error('Error updating suspicious activity:', error);
    }
  }

  /**
   * Get alerts for an exam
   */
  async getExamAlerts(examId: string): Promise<CheatingAlert[]> {
    try {
      const alertsKey = `cheating_alerts_${examId}`;
      return await this.redis.get(alertsKey) as CheatingAlert[] || [];
    } catch (error) {
      console.error('Error getting exam alerts:', error);
      return [];
    }
  }

  /**
   * Get alerts for a specific student
   */
  async getStudentAlerts(examId: string, userId: string): Promise<CheatingAlert[]> {
    const allAlerts = await this.getExamAlerts(examId);
    return allAlerts.filter(alert => alert.userId === userId);
  }

  /**
   * Clear old alerts
   */
  async clearOldAlerts(examId: string, olderThanHours: number = 24): Promise<void> {
    try {
      const alertsKey = `cheating_alerts_${examId}`;
      const alerts = await this.redis.get(alertsKey) as CheatingAlert[] || [];

      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      const recentAlerts = alerts.filter(alert =>
        alert.timestamp.getTime() > cutoffTime
      );

      if (recentAlerts.length !== alerts.length) {
        await this.redis.set(alertsKey, recentAlerts, 60 * 60 * 24);
      }

    } catch (error) {
      console.error('Error clearing old alerts:', error);
    }
  }

  /**
   * Get detection statistics
   */
  getDetectionStats(): {
    activePatterns: number;
    totalAlertsGenerated: number;
    cooldownsActive: number;
  } {
    return {
      activePatterns: this.patterns.length,
      totalAlertsGenerated: 0, // Would need to track this separately
      cooldownsActive: this.alertCooldowns.size
    };
  }
}
