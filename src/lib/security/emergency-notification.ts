/**
 * Emergency Notification Service
 *
 * Comprehensive notification system for critical emergencies during exams
 * with multi-channel delivery, escalation, and acknowledgment tracking.
 */

import { auditLogger } from './audit-logger';

export interface NotificationConfig {
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  enableInAppNotifications: boolean;
  enablePushNotifications: boolean;
  escalationDelay: number; // in milliseconds
  maxEscalationLevels: number;
  notificationTimeout: number; // in milliseconds
  retryAttempts: number;
}

export interface EmergencyNotification {
  id: string;
  emergencyId: string;
  type: 'emergency_detected' | 'recovery_attempted' | 'recovery_failed' | 'escalation' | 'acknowledgment';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  recipient: NotificationRecipient;
  channels: NotificationChannel[];
  timestamp: number;
  acknowledged: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  escalationLevel: number;
  metadata: Record<string, any>;
}

export interface NotificationRecipient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'student' | 'teacher' | 'admin' | 'super_admin';
  collegeId?: string;
  preferences: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    inAppEnabled: boolean;
  };
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'in_app';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'acknowledged';
  sentAt?: number;
  deliveredAt?: number;
  failedAt?: number;
  errorMessage?: string;
  retryCount: number;
}

export interface EscalationRule {
  level: number;
  delay: number; // in milliseconds
  recipients: NotificationRecipient[];
  channels: NotificationChannel['type'][];
  conditions: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    unacknowledgedTime: number; // in milliseconds
    recoveryAttempts: number;
  };
}

export class EmergencyNotificationService {
  private config: NotificationConfig;
  private escalationRules: EscalationRule[];
  private activeNotifications = new Map<string, EmergencyNotification>();
  private notificationHistory = new Map<string, EmergencyNotification[]>();
  private escalationTimeouts = new Map<string, NodeJS.Timeout>();
  private isInitialized = false;

  constructor(config: Partial<NotificationConfig> = {}) {
    this.config = {
      enableEmailNotifications: true,
      enableSMSNotifications: true,
      enableInAppNotifications: true,
      enablePushNotifications: true,
      escalationDelay: 300000, // 5 minutes
      maxEscalationLevels: 3,
      notificationTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      ...config
    };

    this.escalationRules = this.initializeEscalationRules();
  }

  /**
   * Initialize the emergency notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.isInitialized = true;

      auditLogger.logExamSecurity('exam_started', {
        examId: 'system',
        userId: 'system',
        sessionId: 'system',
        severity: 'low',
        description: 'Emergency notification service initialized',
        metadata: { config: this.config }
      });
    } catch (error) {
      console.error('Failed to initialize emergency notification service:', error);
      throw error;
    }
  }

  /**
   * Send emergency notification
   */
  async sendEmergencyNotification(
    emergencyId: string,
    type: EmergencyNotification['type'],
    severity: EmergencyNotification['severity'],
    examId: string,
    userId: string,
    sessionId: string,
    details: Record<string, any>
  ): Promise<string[]> {
    const recipients = await this.determineRecipients(severity, examId, userId);
    const notificationIds: string[] = [];

    for (const recipient of recipients) {
      const notificationId = await this.createAndSendNotification(
        emergencyId,
        type,
        severity,
        recipient,
        examId,
        userId,
        sessionId,
        details
      );
      notificationIds.push(notificationId);
    }

    // Set up escalation if not acknowledged
    if (severity === 'critical' || severity === 'high') {
      this.setupEscalation(emergencyId, examId, userId, sessionId);
    }

    return notificationIds;
  }

  /**
   * Acknowledge notification
   */
  async acknowledgeNotification(
    notificationId: string,
    acknowledgedBy: string
  ): Promise<boolean> {
    const notification = this.activeNotifications.get(notificationId);
    if (!notification) return false;

    notification.acknowledged = true;
    notification.acknowledgedAt = Date.now();
    notification.acknowledgedBy = acknowledgedBy;

    // Clear escalation timeout
    const escalationTimeout = this.escalationTimeouts.get(notification.emergencyId);
    if (escalationTimeout) {
      clearTimeout(escalationTimeout);
      this.escalationTimeouts.delete(notification.emergencyId);
    }

    // Update notification status
    await this.updateNotificationStatus(notification, 'acknowledged');

    auditLogger.logExamSecurity('copy_paste', {
      examId: notification.metadata.examId || 'system',
      userId: notification.metadata.userId || 'system',
      sessionId: notification.metadata.sessionId || 'system',
      severity: 'low',
      description: 'Emergency notification acknowledged',
      metadata: {
        notificationId,
        acknowledgedBy,
        responseTime: notification.acknowledgedAt! - notification.timestamp
      }
    });

    return true;
  }

  /**
   * Get active notifications for a user
   */
  getActiveNotifications(userId: string): EmergencyNotification[] {
    return Array.from(this.activeNotifications.values())
      .filter(notification => notification.recipient.id === userId && !notification.acknowledged);
  }

  /**
   * Get notification history
   */
  getNotificationHistory(
    userId?: string,
    limit: number = 50
  ): EmergencyNotification[] {
    let notifications: EmergencyNotification[] = [];

    if (userId) {
      const history = this.notificationHistory.get(userId) || [];
      notifications = history.slice(-limit);
    } else {
      // Get all notifications
      for (const history of this.notificationHistory.values()) {
        notifications.push(...history);
      }
      notifications = notifications
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    }

    return notifications;
  }

  /**
   * Get escalation status for an emergency
   */
  getEscalationStatus(emergencyId: string): {
    currentLevel: number;
    nextEscalationAt?: number;
    escalatedRecipients: number;
  } {
    const notifications = Array.from(this.activeNotifications.values())
      .filter(n => n.emergencyId === emergencyId);

    const maxLevel = Math.max(...notifications.map(n => n.escalationLevel));
    const nextEscalationTimeout = this.escalationTimeouts.get(emergencyId);

    return {
      currentLevel: maxLevel,
      nextEscalationAt: nextEscalationTimeout ? Date.now() + this.config.escalationDelay : undefined,
      escalatedRecipients: notifications.length
    };
  }

  /**
   * Create and send notification
   */
  private async createAndSendNotification(
    emergencyId: string,
    type: EmergencyNotification['type'],
    severity: EmergencyNotification['severity'],
    recipient: NotificationRecipient,
    examId: string,
    userId: string,
    sessionId: string,
    details: Record<string, any>
  ): Promise<string> {
    const notificationId = this.generateNotificationId();

    const notification: EmergencyNotification = {
      id: notificationId,
      emergencyId,
      type,
      severity,
      title: this.generateNotificationTitle(type, severity, details),
      message: this.generateNotificationMessage(type, severity, details),
      recipient,
      channels: this.determineChannels(recipient, severity),
      timestamp: Date.now(),
      acknowledged: false,
      escalationLevel: 1,
      metadata: {
        examId,
        userId,
        sessionId,
        ...details
      }
    };

    // Store notification
    this.activeNotifications.set(notificationId, notification);

    // Send notification through all channels
    await this.sendNotificationThroughChannels(notification);

    // Add to history
    const history = this.notificationHistory.get(recipient.id) || [];
    history.push(notification);
    this.notificationHistory.set(recipient.id, history);

    return notificationId;
  }

  /**
   * Send notification through all configured channels
   */
  private async sendNotificationThroughChannels(notification: EmergencyNotification): Promise<void> {
    const sendPromises = notification.channels.map(channel =>
      this.sendThroughChannel(notification, channel)
    );

    await Promise.allSettled(sendPromises);
  }

  /**
   * Send notification through a specific channel
   */
  private async sendThroughChannel(
    notification: EmergencyNotification,
    channel: NotificationChannel
  ): Promise<void> {
    try {
      channel.status = 'pending';
      channel.sentAt = Date.now();

      switch (channel.type) {
        case 'email':
          await this.sendEmailNotification(notification, channel);
          break;
        case 'sms':
          await this.sendSMSNotification(notification, channel);
          break;
        case 'push':
          await this.sendPushNotification(notification, channel);
          break;
        case 'in_app':
          await this.sendInAppNotification(notification, channel);
          break;
      }

      channel.status = 'sent';
      channel.deliveredAt = Date.now();

    } catch (error) {
      channel.status = 'failed';
      channel.failedAt = Date.now();
      channel.errorMessage = error instanceof Error ? error.message : String(error);

      // Retry if attempts remaining
      if (channel.retryCount < this.config.retryAttempts) {
        channel.retryCount++;
        // Schedule retry
        setTimeout(() => {
          this.sendThroughChannel(notification, channel);
        }, 2000 * channel.retryCount); // Exponential backoff
      }
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    notification: EmergencyNotification,
    channel: NotificationChannel
  ): Promise<void> {
    if (!notification.recipient.email || !notification.recipient.preferences.emailEnabled) {
      throw new Error('Email not configured or disabled');
    }

    // Implementation for email sending
    // This would integrate with your email service (SendGrid, etc.)
    console.log('Sending email notification:', {
      to: notification.recipient.email,
      subject: notification.title,
      message: notification.message
    });

    // Simulate email sending
    await this.delay(1000);
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    notification: EmergencyNotification,
    channel: NotificationChannel
  ): Promise<void> {
    if (!notification.recipient.phone || !notification.recipient.preferences.smsEnabled) {
      throw new Error('SMS not configured or disabled');
    }

    // Implementation for SMS sending
    // This would integrate with your SMS service (Twilio, etc.)
    console.log('Sending SMS notification:', {
      to: notification.recipient.phone,
      message: notification.message
    });

    // Simulate SMS sending
    await this.delay(500);
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    notification: EmergencyNotification,
    channel: NotificationChannel
  ): Promise<void> {
    if (!notification.recipient.preferences.pushEnabled) {
      throw new Error('Push notifications disabled');
    }

    // Implementation for push notification
    // This would integrate with your push service
    console.log('Sending push notification:', {
      to: notification.recipient.id,
      title: notification.title,
      message: notification.message
    });

    // Simulate push sending
    await this.delay(300);
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(
    notification: EmergencyNotification,
    channel: NotificationChannel
  ): Promise<void> {
    if (!notification.recipient.preferences.inAppEnabled) {
      throw new Error('In-app notifications disabled');
    }

    // Implementation for in-app notification
    // This would integrate with your real-time notification system
    console.log('Sending in-app notification:', {
      to: notification.recipient.id,
      notification
    });

    // Simulate in-app sending
    await this.delay(100);
  }

  /**
   * Set up escalation for unacknowledged notifications
   */
  private setupEscalation(
    emergencyId: string,
    examId: string,
    userId: string,
    sessionId: string
  ): void {
    const escalationTimeout = setTimeout(() => {
      this.performEscalation(emergencyId, examId, userId, sessionId);
    }, this.config.escalationDelay);

    this.escalationTimeouts.set(emergencyId, escalationTimeout);
  }

  /**
   * Perform escalation
   */
  private async performEscalation(
    emergencyId: string,
    examId: string,
    userId: string,
    sessionId: string
  ): Promise<void> {
    const notifications = Array.from(this.activeNotifications.values())
      .filter(n => n.emergencyId === emergencyId && !n.acknowledged);

    if (notifications.length === 0) return;

    const maxLevel = Math.max(...notifications.map(n => n.escalationLevel));
    const nextLevel = maxLevel + 1;

    if (nextLevel > this.config.maxEscalationLevels) {
      // Max escalation reached
      auditLogger.logExamSecurity('copy_paste', {
        examId,
        userId,
        sessionId,
        severity: 'critical',
        description: 'Maximum escalation level reached',
        metadata: { emergencyId, maxLevel }
      });
      return;
    }

    // Get escalation rule
    const escalationRule = this.escalationRules.find(rule => rule.level === nextLevel);
    if (!escalationRule) return;

    // Send escalated notifications
    for (const recipient of escalationRule.recipients) {
      await this.sendEmergencyNotification(
        emergencyId,
        'escalation',
        notifications[0].severity,
        examId,
        userId,
        sessionId,
        {
          escalationLevel: nextLevel,
          originalNotifications: notifications.length,
          escalationReason: 'unacknowledged_emergency'
        }
      );
    }

    // Set up next escalation
    this.setupEscalation(emergencyId, examId, userId, sessionId);
  }

  /**
   * Determine notification recipients based on severity
   */
  private async determineRecipients(
    severity: EmergencyNotification['severity'],
    examId: string,
    userId: string
  ): Promise<NotificationRecipient[]> {
    // Implementation to determine who should receive notifications
    // This would query your user/role system
    const recipients: NotificationRecipient[] = [];

    // Add student
    recipients.push({
      id: userId,
      name: 'Student',
      role: 'student',
      preferences: {
        emailEnabled: this.config.enableEmailNotifications,
        smsEnabled: this.config.enableSMSNotifications,
        pushEnabled: this.config.enablePushNotifications,
        inAppEnabled: this.config.enableInAppNotifications
      }
    });

    // Add teacher/admin based on severity
    if (severity === 'high' || severity === 'critical') {
      recipients.push({
        id: 'teacher_1',
        name: 'Teacher',
        email: 'teacher@college.edu',
        role: 'teacher',
        preferences: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: true,
          inAppEnabled: true
        }
      });
    }

    // Add admin for critical issues
    if (severity === 'critical') {
      recipients.push({
        id: 'admin_1',
        name: 'Administrator',
        email: 'admin@college.edu',
        phone: '+1234567890',
        role: 'admin',
        preferences: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: true,
          inAppEnabled: true
        }
      });
    }

    return recipients;
  }

  /**
   * Determine notification channels for recipient
   */
  private determineChannels(
    recipient: NotificationRecipient,
    severity: EmergencyNotification['severity']
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    if (recipient.preferences.emailEnabled && this.config.enableEmailNotifications) {
      channels.push({ type: 'email', status: 'pending', retryCount: 0 });
    }

    if (recipient.preferences.smsEnabled && this.config.enableSMSNotifications &&
        (severity === 'high' || severity === 'critical')) {
      channels.push({ type: 'sms', status: 'pending', retryCount: 0 });
    }

    if (recipient.preferences.pushEnabled && this.config.enablePushNotifications) {
      channels.push({ type: 'push', status: 'pending', retryCount: 0 });
    }

    if (recipient.preferences.inAppEnabled && this.config.enableInAppNotifications) {
      channels.push({ type: 'in_app', status: 'pending', retryCount: 0 });
    }

    return channels;
  }

  /**
   * Generate notification title
   */
  private generateNotificationTitle(
    type: EmergencyNotification['type'],
    severity: EmergencyNotification['severity'],
    details: Record<string, any>
  ): string {
    const severityText = severity.toUpperCase();
    const typeText = type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    return `${severityText}: ${typeText}`;
  }

  /**
   * Generate notification message
   */
  private generateNotificationMessage(
    type: EmergencyNotification['type'],
    severity: EmergencyNotification['severity'],
    details: Record<string, any>
  ): string {
    switch (type) {
      case 'emergency_detected':
        return `A ${severity} emergency has been detected during your exam. Please check the system status.`;
      case 'recovery_attempted':
        return `System recovery has been initiated for the ${severity} emergency.`;
      case 'recovery_failed':
        return `Recovery attempt failed for the ${severity} emergency. Manual intervention may be required.`;
      case 'escalation':
        return `Emergency escalation: ${severity} issue requires immediate attention.`;
      case 'acknowledgment':
        return `Emergency notification has been acknowledged.`;
      default:
        return `Emergency notification: ${severity} severity event occurred.`;
    }
  }

  /**
   * Initialize escalation rules
   */
  private initializeEscalationRules(): EscalationRule[] {
    return [
      {
        level: 1,
        delay: 0,
        recipients: [], // Primary recipients
        channels: ['email', 'in_app'],
        conditions: {
          severity: 'medium',
          unacknowledgedTime: 300000, // 5 minutes
          recoveryAttempts: 0
        }
      },
      {
        level: 2,
        delay: 300000, // 5 minutes
        recipients: [], // Secondary recipients (managers)
        channels: ['email', 'sms', 'push'],
        conditions: {
          severity: 'high',
          unacknowledgedTime: 600000, // 10 minutes
          recoveryAttempts: 2
        }
      },
      {
        level: 3,
        delay: 600000, // 10 minutes
        recipients: [], // Tertiary recipients (admins)
        channels: ['email', 'sms', 'push'],
        conditions: {
          severity: 'critical',
          unacknowledgedTime: 900000, // 15 minutes
          recoveryAttempts: 3
        }
      }
    ];
  }

  /**
   * Update notification status
   */
  private async updateNotificationStatus(
    notification: EmergencyNotification,
    status: NotificationChannel['status']
  ): Promise<void> {
    // Update all channels
    for (const channel of notification.channels) {
      channel.status = status;
      if (status === 'acknowledged') {
        channel.deliveredAt = Date.now();
      }
    }
  }

  /**
   * Generate notification ID
   */
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Destroy the service and clean up resources
   */
  destroy(): void {
    // Clear all escalation timeouts
    for (const timeout of this.escalationTimeouts.values()) {
      clearTimeout(timeout);
    }

    this.escalationTimeouts.clear();
    this.activeNotifications.clear();
    this.notificationHistory.clear();
  }
}

// Export singleton instance
export const emergencyNotificationService = new EmergencyNotificationService();
