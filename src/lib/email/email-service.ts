import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import { InvitationEmail } from '@/components/emails/InvitationEmail';
import { WelcomeEmail } from '@/components/emails/WelcomeEmail';
import { PasswordResetEmail } from '@/components/emails/PasswordResetEmail';
import { EmailVerificationEmail } from '@/components/emails/EmailVerificationEmail';
import { PrismaClient } from '@prisma/client';
import { rateLimiter } from '@/lib/security/rate-limiter';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  provider?: 'smtp' | 'sendgrid';
  sendgridApiKey?: string;
  rateLimitPerHour?: number;
  maxRetries?: number;
}

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
  template?: string;
  metadata?: Record<string, any>;
  collegeId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface EmailLogEntry {
  id: string;
  to: string;
  from: string;
  subject: string;
  template?: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'FAILED' | 'CANCELLED';
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  messageId?: string;
  provider: string;
  metadata?: Record<string, any>;
  collegeId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailVerificationData {
  to: string;
  userName: string;
  verificationToken: string;
  expiresAt: Date;
  collegeName?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;
  private prisma: PrismaClient;

  constructor(config: EmailConfig, prisma: PrismaClient) {
    this.config = config;
    this.prisma = prisma;

    if (config.provider === 'sendgrid' && config.sendgridApiKey) {
      // For SendGrid, we'll use nodemailer with SendGrid SMTP
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: config.sendgridApiKey,
        },
      });
    } else {
      // Default SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
      });
    }
  }

  /**
   * Send user invitation email
   */
  async sendInvitationEmail(data: {
    to: string;
    inviterName: string;
    inviterEmail: string;
    collegeName: string;
    role: string;
    invitationToken: string;
    expiresAt: Date;
  }): Promise<void> {
    const invitationUrl = `${process.env.NEXTAUTH_URL}/auth/accept-invitation?token=${data.invitationToken}`;
    
    const html = await render(InvitationEmail({
      inviterName: data.inviterName,
      inviterEmail: data.inviterEmail,
      collegeName: data.collegeName,
      role: data.role,
      invitationUrl,
      expiresAt: data.expiresAt,
    }));

    await this.sendEmail({
      to: data.to,
      subject: `Invitation to join ${data.collegeName}`,
      html,
      text: `You have been invited to join ${data.collegeName} as a ${data.role}. Click here to accept: ${invitationUrl}`,
    });
  }

  /**
   * Send welcome email after account creation
   */
  async sendWelcomeEmail(data: {
    to: string;
    userName: string;
    collegeName: string;
    role: string;
    loginUrl: string;
  }): Promise<void> {
    const html = await render(WelcomeEmail({
      userName: data.userName,
      collegeName: data.collegeName,
      role: data.role,
      loginUrl: data.loginUrl,
    }));

    await this.sendEmail({
      to: data.to,
      subject: `Welcome to ${data.collegeName}!`,
      html,
      text: `Welcome to ${data.collegeName}! You can now log in at: ${data.loginUrl}`,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: {
    to: string;
    userName: string;
    resetToken: string;
    expiresAt: Date;
    collegeId?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${data.resetToken}`;
    
    const html = await render(PasswordResetEmail({
      userName: data.userName,
      resetUrl,
      expiresAt: data.expiresAt,
    }));

    await this.sendEmail({
      to: data.to,
      subject: 'Password Reset Request',
      html,
      text: `You requested a password reset. Click here to reset: ${resetUrl}`,
      template: 'password-reset',
      collegeId: data.collegeId,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }

  /**
   * Send email verification email
   */
  async sendEmailVerificationEmail(data: EmailVerificationData & {
    collegeId?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${data.verificationToken}`;
    
    const html = await render(EmailVerificationEmail({
      userName: data.userName,
      verificationUrl,
      expiresAt: data.expiresAt,
      collegeName: data.collegeName,
    }));

    await this.sendEmail({
      to: data.to,
      subject: 'Verify Your Email Address',
      html,
      text: `Please verify your email address by clicking: ${verificationUrl}`,
      template: 'email-verification',
      collegeId: data.collegeId,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }

  /**
   * Send generic email with logging and rate limiting
   */
  async sendEmail(template: EmailTemplate): Promise<EmailLogEntry> {
    // Check rate limit
    const rateLimitKey = `email:${template.to}`;
    const rateLimitResult = rateLimiter.checkRateLimit(rateLimitKey, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: this.config.rateLimitPerHour || 10,
    });
    
    if (!rateLimitResult.allowed) {
      throw new Error(`Email rate limit exceeded for ${template.to}. Try again in ${rateLimitResult.retryAfter} seconds.`);
    }

    // Create email log entry
    const emailLog = await (this.prisma as any).emailLog.create({
      data: {
        to: template.to,
        from: this.config.from,
        subject: template.subject,
        template: template.template,
        status: 'PENDING',
        provider: this.config.provider || 'smtp',
        metadata: template.metadata,
        collegeId: template.collegeId,
        userId: template.userId,
        ipAddress: template.ipAddress,
        userAgent: template.userAgent,
        maxRetries: this.config.maxRetries || 3,
      },
    });

    try {
      const result = await this.transporter.sendMail({
        from: this.config.from,
        to: template.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      // Update email log with success
      const updatedLog = await (this.prisma as any).emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId: result.messageId,
        },
      });

      return updatedLog as EmailLogEntry;
    } catch (error) {
      // Update email log with failure
      const updatedLog = await (this.prisma as any).emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: error instanceof Error ? error.message : 'Unknown error',
          retryCount: emailLog.retryCount + 1,
        },
      });

      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email configuration verification failed:', error);
      return false;
    }
  }

  /**
   * Retry failed emails
   */
  async retryFailedEmails(): Promise<number> {
    const failedEmails = await (this.prisma as any).emailLog.findMany({
      where: {
        status: 'FAILED',
        retryCount: {
          lt: this.config.maxRetries || 3,
        },
      },
      take: 10, // Process in batches
    });

    let retryCount = 0;
    for (const emailLog of failedEmails) {
      try {
        await this.transporter.sendMail({
          from: emailLog.from,
          to: emailLog.to,
          subject: emailLog.subject,
        });

        await (this.prisma as any).emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            retryCount: emailLog.retryCount + 1,
          },
        });

        retryCount++;
      } catch (error) {
        await (this.prisma as any).emailLog.update({
          where: { id: emailLog.id },
          data: {
            retryCount: emailLog.retryCount + 1,
            failureReason: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    return retryCount;
  }

  /**
   * Get email statistics
   */
  async getEmailStats(collegeId?: string, userId?: string): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
  }> {
    const where: any = {};
    if (collegeId) where.collegeId = collegeId;
    if (userId) where.userId = userId;

    const [total, sent, delivered, failed, pending] = await Promise.all([
      (this.prisma as any).emailLog.count({ where }),
      (this.prisma as any).emailLog.count({ where: { ...where, status: 'SENT' } }),
      (this.prisma as any).emailLog.count({ where: { ...where, status: 'DELIVERED' } }),
      (this.prisma as any).emailLog.count({ where: { ...where, status: 'FAILED' } }),
      (this.prisma as any).emailLog.count({ where: { ...where, status: 'PENDING' } }),
    ]);

    return { total, sent, delivered, failed, pending };
  }

  /**
   * Clean up old email logs
   */
  async cleanupOldLogs(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await (this.prisma as any).emailLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: {
          in: ['SENT', 'DELIVERED', 'FAILED'],
        },
      },
    });

    return result.count;
  }
}

// Singleton instance
let emailService: EmailService | null = null;

export function getEmailService(prisma?: PrismaClient): EmailService {
  if (!emailService) {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
      provider: (process.env.EMAIL_PROVIDER as 'smtp' | 'sendgrid') || 'smtp',
      sendgridApiKey: process.env.SENDGRID_API_KEY,
      rateLimitPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR || '100'),
      maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3'),
    };

    // Use provided Prisma client or create a new one
    const prismaClient = prisma || new PrismaClient();
    emailService = new EmailService(config, prismaClient);
  }

  return emailService;
}
