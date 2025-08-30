import { db } from '@/lib/db';
import { getRedisCache } from '@/lib/cache/redis-cache';
import { CheatingAlert } from '@/lib/types/exam-monitoring';
import nodemailer from 'nodemailer';

export interface NotificationConfig {
  email: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
  };
  sms: {
    enabled: boolean;
    provider: string;
    apiKey: string;
  };
  inApp: {
    enabled: boolean;
  };
  webhook: {
    enabled: boolean;
    url: string;
    secret: string;
  };
}

export interface NotificationRecipient {
  userId: string;
  channels: ('EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK')[];
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface NotificationTemplate {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'REMINDER';
  variables: Record<string, string>;
}

/**
 * Notification Service - Handles sending notifications for exam events and cheating alerts
 */
export class NotificationService {
  private static instance: NotificationService;
  private redis = getRedisCache();
  private config: NotificationConfig;
  private emailTransporter: nodemailer.Transporter | null = null; // Email transporter

  private constructor() {
    this.config = this.loadConfig();
    this.initializeEmailTransporter();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Load notification configuration
   */
  private loadConfig(): NotificationConfig {
    return {
      email: {
        enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
        smtp: {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
          }
        }
      },
      sms: {
        enabled: process.env.SMS_NOTIFICATIONS_ENABLED === 'true',
        provider: process.env.SMS_PROVIDER || 'twilio',
        apiKey: process.env.SMS_API_KEY || ''
      },
      inApp: {
        enabled: true // Always enabled for in-app notifications
      },
      webhook: {
        enabled: process.env.WEBHOOK_NOTIFICATIONS_ENABLED === 'true',
        url: process.env.WEBHOOK_URL || '',
        secret: process.env.WEBHOOK_SECRET || ''
      }
    };
  }

  /**
   * Initialize email transporter
   */
  private initializeEmailTransporter(): void {
    try {
    if (this.config.email.enabled && this.config.email.smtp.auth.user) {
        this.emailTransporter = nodemailer.createTransport({
        host: this.config.email.smtp.host,
        port: this.config.email.smtp.port,
        secure: this.config.email.smtp.secure,
        auth: this.config.email.smtp.auth
      });
      }
    } catch (error) {
      this.emailTransporter = null;
      console.error('Email transporter initialization failed:', error);
    }
  }

  /**
   * Send cheating alert notifications
   */
  async sendCheatingAlert(alert: CheatingAlert): Promise<void> {
    try {
      // Get exam and student details
      const [exam, student] = await Promise.all([
        db.exam.findUnique({
          where: { id: alert.examId },
          include: { subject: true, college: true }
        }),
        db.user.findUnique({
          where: { id: alert.userId },
          include: { studentProfile: true }
        })
      ]);

      if (!exam || !student) {
        console.error('Could not find exam or student for cheating alert');
        return;
      }

      // Get teachers/admins for the exam
      const recipients = await this.getExamRecipients(exam.id);

      // Create notification template
      const template = this.createCheatingAlertTemplate(alert, exam, student);

      // Send notifications to all recipients
      const notificationPromises = recipients.map(recipient =>
        this.sendNotificationToRecipient(recipient, template, alert)
      );

      await Promise.allSettled(notificationPromises);

      console.log(`📤 Sent cheating alert notifications to ${recipients.length} recipients`);

    } catch (error) {
      console.error('Error sending cheating alert notifications:', error);
    }
  }

  /**
   * Send exam completion notifications
   */
  async sendExamCompletionNotification(examId: string, studentId: string): Promise<void> {
    try {
      const [exam, student] = await Promise.all([
        db.exam.findUnique({
          where: { id: examId },
          include: { subject: true }
        }),
        db.user.findUnique({ where: { id: studentId } })
      ]);

      if (!exam || !student) return;

      // Notify student
      await this.sendNotificationToUser(studentId, {
        id: 'exam_completed_student',
        title: 'Exam Completed',
        message: `You have successfully completed the exam: ${exam.title}`,
        type: 'SUCCESS',
        variables: { examTitle: exam.title }
      }, ['IN_APP', 'EMAIL']);

      // Notify teachers
      const teachers = await this.getExamTeachers(examId);
      const teacherPromises = teachers.map(teacher =>
        this.sendNotificationToUser(teacher.id, {
          id: 'exam_completed_teacher',
          title: 'Student Completed Exam',
          message: `${student.name} has completed the exam: ${exam.title}`,
          type: 'INFO',
          variables: { examTitle: exam.title, studentName: student.name || '' }
        }, ['IN_APP'])
      );

      await Promise.allSettled(teacherPromises);

    } catch (error) {
      console.error('Error sending exam completion notifications:', error);
    }
  }

  /**
   * Send exam start notifications
   */
  async sendExamStartNotification(examId: string): Promise<void> {
    try {
      const exam = await db.exam.findUnique({
        where: { id: examId },
        include: {
          subject: true,
          class: {
            include: {
          enrollments: {
            include: { user: true }
              }
            }
          }
        }
      });

      if (!exam) return;

      // Notify enrolled students
      const studentPromises = (exam.class?.enrollments || []).map((enrollment: any) =>
        this.sendNotificationToUser(enrollment.userId, {
          id: 'exam_start_reminder',
          title: 'Exam Starting Soon',
          message: `Your exam "${exam.title}" is starting at ${exam.startTime.toLocaleString()}`,
          type: 'REMINDER',
          variables: { examTitle: exam.title, startTime: exam.startTime.toISOString() }
        }, ['IN_APP', 'EMAIL'])
      );

      await Promise.allSettled(studentPromises);

      console.log(`📤 Sent exam start notifications to ${(exam.class?.enrollments || []).length} students`);

    } catch (error) {
      console.error('Error sending exam start notifications:', error);
    }
  }

  /**
   * Send system alert notifications
   */
  async sendSystemAlert(
    recipients: string[],
    title: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    try {
      const type = this.mapSeverityToType(severity);
      const template: NotificationTemplate = { id: 'system_alert', title, message, type, variables: {} };

      const notificationPromises = recipients.map(userId =>
        this.sendNotificationToUser(userId, template, ['IN_APP', 'EMAIL'])
      );

      await Promise.allSettled(notificationPromises);

    } catch (error) {
      console.error('Error sending system alert:', error);
    }
  }

  /**
   * Get recipients for exam notifications (teachers/admins)
   */
  private async getExamRecipients(examId: string): Promise<NotificationRecipient[]> {
    try {
      // Get college admins
      const exam = await db.exam.findUnique({
        where: { id: examId },
        include: { college: true }
      });

      if (!exam) return [];

      const collegeAdmins = await db.user.findMany({
        where: {
          collegeId: exam.collegeId,
          role: { in: ['COLLEGE_ADMIN', 'SUPER_ADMIN'] }
        }
      });

      // Get subject teachers
      const subjectTeachers = await db.user.findMany({
        where: {
          teacherAssignments: {
            some: {
              subjectId: exam.subjectId,
              isActive: true
            }
          }
        }
      });

      // Combine and deduplicate
      const allUsers = [...collegeAdmins, ...subjectTeachers];
      const uniqueUsers = allUsers.filter((user, index, self) =>
        index === self.findIndex(u => u.id === user.id)
      );

      return uniqueUsers.map(user => ({
        userId: user.id,
        channels: ['IN_APP', 'EMAIL'],
        priority: 'HIGH'
      }));

    } catch (error) {
      console.error('Error getting exam recipients:', error);
      return [];
    }
  }

  /**
   * Get teachers assigned to an exam
   */
  private async getExamTeachers(examId: string): Promise<Array<{ id: string; name: string; email: string }>> {
    try {
      const exam = await db.exam.findUnique({
        where: { id: examId },
        include: { subject: true }
      });

      if (!exam) return [];

      return await db.user.findMany({
        where: {
          teacherAssignments: {
            some: {
              subjectId: exam.subjectId,
              isActive: true
            }
          }
        }
      });

    } catch (error) {
      console.error('Error getting exam teachers:', error);
      return [];
    }
  }

  /**
   * Create cheating alert notification template
   */
  private createCheatingAlertTemplate(
    alert: CheatingAlert,
    exam: any,
    student: any
  ): NotificationTemplate {
    const severityEmoji = {
      low: '⚠️',
      medium: '🚨',
      high: '🔴',
      critical: '🚨🚨'
    };

    return {
      id: 'cheating_alert',
      title: `${severityEmoji[alert.severity]} Cheating Alert - ${exam.title}`,
      message: `Suspicious activity detected for ${student.name} (Roll: ${student.studentProfile?.rollNo || 'N/A'}) in exam "${exam.title}". Pattern: ${alert.alertType}. Severity: ${alert.severity.toUpperCase()}`,
      type: 'ERROR',
      variables: {
        studentName: student.name,
        studentRoll: student.studentProfile?.rollNo || 'N/A',
        examTitle: exam.title,
        subjectName: exam.subject.name,
        alertType: alert.alertType,
        severity: alert.severity,
        timestamp: alert.timestamp.toISOString()
      }
    };
  }

  /**
   * Send notification to a specific recipient
   */
  private async sendNotificationToRecipient(
    recipient: NotificationRecipient,
    template: NotificationTemplate,
    alert?: CheatingAlert
  ): Promise<void> {
    const promises = recipient.channels.map(channel =>
      this.sendNotification(template, recipient.userId, channel, alert)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Send notification to a user via specified channels
   */
  private async sendNotificationToUser(
    userId: string,
    template: NotificationTemplate,
    channels: ('EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK')[] = ['IN_APP']
  ): Promise<void> {
    const promises = channels.map(channel =>
      this.sendNotification(template, userId, channel)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Send notification via specific channel
   */
  private async sendNotification(
    template: NotificationTemplate,
    userId: string,
    channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK',
    alert?: CheatingAlert
  ): Promise<void> {
    try {
      // Create notification record in database
      const notification = await db.notification.create({
        data: {
          userId,
          title: template.title,
          message: template.message,
          type: template.type,
          channel,
          status: 'PENDING',
          metadata: alert ? { alert: JSON.parse(JSON.stringify(alert)), template: template.variables } : template.variables,
          collegeId: await this.getUserCollegeId(userId)
        }
      });

      // Send via appropriate channel
      switch (channel) {
        case 'EMAIL':
          await this.sendEmailNotification(notification);
          break;
        case 'SMS':
          await this.sendSMSNotification(notification);
          break;
        case 'IN_APP':
          // In-app notifications are handled by the database record
          await db.notification.update({
            where: { id: notification.id },
            data: { status: 'DELIVERED', deliveredAt: new Date() }
          });
          break;
        case 'WEBHOOK':
          await this.sendWebhookNotification(notification);
          break;
      }

    } catch (error) {
      console.error(`Error sending ${channel} notification:`, error);
      // We can't reference 'notification' here safely if creation failed; best-effort logging only
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: any): Promise<void> {
    if (!this.config.email.enabled || !this.emailTransporter) {
      throw new Error('Email notifications not configured');
    }

    const user = await db.user.findUnique({ where: { id: notification.userId } });
    if (!user?.email) {
      throw new Error('User email not found');
    }

    const mailOptions = {
      from: this.config.email.smtp.auth.user,
      to: user.email,
      subject: notification.title,
      html: this.formatEmailMessage(notification)
    };

    const info = await this.emailTransporter.sendMail(mailOptions);

    // Update notification status
    await db.notification.update({
      where: { id: notification.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        // Provider messageId is stored in EmailLog model, not Notification
      }
    });
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(notification: any): Promise<void> {
    if (!this.config.sms.enabled) {
      throw new Error('SMS notifications not configured');
    }

    // Implementation would depend on SMS provider (Twilio, etc.)
    console.log(`📱 SMS notification to be sent: ${notification.message}`);

    // For now, just mark as sent
    await db.notification.update({
      where: { id: notification.id },
      data: {
        status: 'SENT',
        sentAt: new Date()
      }
    });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(notification: any): Promise<void> {
    if (!this.config.webhook.enabled || !this.config.webhook.url) {
      throw new Error('Webhook notifications not configured');
    }

    const payload = {
      notification,
      timestamp: new Date().toISOString(),
      signature: this.generateWebhookSignature(notification)
    };

    const response = await fetch(this.config.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': payload.signature
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status}`);
    }

    await db.notification.update({
      where: { id: notification.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date()
      }
    });
  }

  /**
   * Format email message with HTML template
   */
  private formatEmailMessage(notification: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${notification.title}</h2>
        <p style="color: #666; line-height: 1.6;">${notification.message}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          This notification was sent by the Exam Management System.
        </p>
      </div>
    `;
  }

  /**
   * Generate webhook signature for security
   */
  private generateWebhookSignature(notification: any): string {
    // Simple signature generation - in production, use proper HMAC
    return Buffer.from(JSON.stringify(notification)).toString('base64');
  }

  /**
   * Get user's college ID
   */
  private async getUserCollegeId(userId: string): Promise<string> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { collegeId: true }
    });
    return user?.collegeId || '';
  }

  /**
   * Map severity to notification type
   */
  private mapSeverityToType(severity: 'low' | 'medium' | 'high' | 'critical'): 'INFO' | 'WARNING' | 'ERROR' {
    switch (severity) {
      case 'low':
      case 'medium':
        return 'WARNING';
      case 'high':
      case 'critical':
        return 'ERROR';
      default:
        return 'INFO';
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<{
    totalSent: number;
    totalFailed: number;
    totalPending: number;
    byChannel: Record<string, number>;
  }> {
    const stats = await db.notification.groupBy({
      by: ['status', 'channel'],
      _count: true
    });

    const result = {
      totalSent: 0,
      totalFailed: 0,
      totalPending: 0,
      byChannel: {} as Record<string, number>
    };

    for (const stat of stats) {
      result.byChannel[stat.channel] = (result.byChannel[stat.channel] || 0) + stat._count;

      switch (stat.status) {
        case 'SENT':
        case 'DELIVERED':
          result.totalSent += stat._count;
          break;
        case 'FAILED':
          result.totalFailed += stat._count;
          break;
        case 'PENDING':
          result.totalPending += stat._count;
          break;
      }
    }

    return result;
  }
}
