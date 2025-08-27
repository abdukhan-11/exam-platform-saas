import { PrismaClient } from '@prisma/client';
import { EmailTemplate } from './email-service';

export interface EmailQueueItem {
  id: string;
  template: EmailTemplate;
  priority: 'high' | 'normal' | 'low';
  scheduledAt?: Date;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueConfig {
  maxConcurrentEmails: number;
  retryDelays: number[]; // Delays in milliseconds for each retry
  maxRetries: number;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  batchSize: number;
  processingTimeout: number; // Timeout for processing in milliseconds
}

export interface QueueStats {
  totalQueued: number;
  totalProcessed: number;
  totalFailed: number;
  averageProcessingTime: number;
  currentQueueSize: number;
  processingEmails: number;
  failedEmails: number;
  retryQueueSize: number;
}

export class EmailQueueService {
  private prisma: PrismaClient;
  private config: QueueConfig;
  private processingEmails: Set<string> = new Set();
  private isProcessing: boolean = false;

  constructor(prisma: PrismaClient, config?: Partial<QueueConfig>) {
    this.prisma = prisma;
    this.config = {
      maxConcurrentEmails: 5,
      retryDelays: [60000, 300000, 900000, 3600000], // 1min, 5min, 15min, 1hour
      maxRetries: 3,
      rateLimitPerMinute: 60,
      rateLimitPerHour: 1000,
      batchSize: 10,
      processingTimeout: 30000, // 30 seconds
      ...config
    };
  }

  /**
   * Add email to queue
   */
  async addToQueue(template: EmailTemplate, priority: 'high' | 'normal' | 'low' = 'normal', scheduledAt?: Date): Promise<string> {
    try {
      // Create email log entry with PENDING status
      const emailLog = await this.prisma.emailLog.create({
        data: {
          to: template.to,
          from: 'noreply@platform.com', // Default from address
          subject: template.subject,
          template: template.template || 'custom',
          status: 'PENDING',
          provider: 'smtp', // Default provider
          metadata: template.metadata,
          collegeId: template.collegeId,
          userId: template.userId,
          ipAddress: template.ipAddress,
          userAgent: template.userAgent,
          maxRetries: this.config.maxRetries,
        }
      });

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }

      return emailLog.id;
    } catch (error) {
      console.error('Error adding email to queue:', error);
      throw new Error('Failed to add email to queue');
    }
  }

  /**
   * Process the email queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (true) {
        // Check if we can process more emails
        if (this.processingEmails.size >= this.config.maxConcurrentEmails) {
          await this.delay(1000); // Wait 1 second
          continue;
        }

        // Get next batch of pending emails
        const pendingEmails = await this.prisma.emailLog.findMany({
          where: {
            status: 'PENDING',
            retryCount: { lt: this.config.maxRetries }
          },
          orderBy: [
            { createdAt: 'asc' }  // By creation time (oldest first)
          ],
          take: this.config.batchSize
        });

        if (pendingEmails.length === 0) {
          // No more emails to process
          break;
        }

        // Process emails concurrently
        const processingPromises = pendingEmails.map(email => this.processEmail(email.id));
        await Promise.allSettled(processingPromises);

        // Small delay to prevent overwhelming the system
        await this.delay(100);
      }
    } catch (error) {
      console.error('Error processing email queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single email
   */
  private async processEmail(emailId: string): Promise<void> {
    if (this.processingEmails.has(emailId)) {
      return; // Already processing
    }

    this.processingEmails.add(emailId);

    try {
      // Get email details
      const emailLog = await this.prisma.emailLog.findUnique({
        where: { id: emailId }
      });

      if (!emailLog) {
        throw new Error('Email not found');
      }

      // Check rate limits
      if (!this.checkRateLimits(emailLog.to)) {
        // Move to retry queue
        await this.scheduleRetry(emailId);
        return;
      }

      // Update status to pending (processing is not a valid status in our enum)
      await this.prisma.emailLog.update({
        where: { id: emailId },
        data: { status: 'PENDING' }
      });

      // Simulate email sending (replace with actual email service call)
      const success = await this.sendEmail(emailLog);

      if (success) {
        // Update status to sent
        await this.prisma.emailLog.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt: new Date()
          }
        });
      } else {
        throw new Error('Email sending failed');
      }
    } catch (error) {
      console.error(`Error processing email ${emailId}:`, error);
      
      // Update status to failed
      await this.prisma.emailLog.update({
        where: { id: emailId },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      // Schedule retry if under max retries
      const emailLog = await this.prisma.emailLog.findUnique({
        where: { id: emailId }
      });

      if (emailLog && emailLog.retryCount < this.config.maxRetries) {
        await this.scheduleRetry(emailId);
      }
    } finally {
      this.processingEmails.delete(emailId);
    }
  }

  /**
   * Schedule email for retry
   */
  private async scheduleRetry(emailId: string): Promise<void> {
    try {
      const emailLog = await this.prisma.emailLog.findUnique({
        where: { id: emailId }
      });

      if (!emailLog) {
        return;
      }

      const retryDelay = this.config.retryDelays[emailLog.retryCount] || this.config.retryDelays[this.config.retryDelays.length - 1];
      const retryAt = new Date(Date.now() + retryDelay);

      // Update retry count and schedule retry
      await this.prisma.emailLog.update({
        where: { id: emailId },
        data: {
          retryCount: emailLog.retryCount + 1,
          status: 'PENDING'
        }
      });

      // Schedule retry using setTimeout (in production, use a proper job queue)
      setTimeout(() => {
        this.processQueue();
      }, retryDelay);

    } catch (error) {
      console.error('Error scheduling retry:', error);
    }
  }

  /**
   * Check rate limits
   */
  private checkRateLimits(email: string): boolean {
    // Simple in-memory rate limiting (in production, use Redis or similar)
    const now = Date.now();
    const minuteKey = `rate_limit_minute_${email}`;
    const hourKey = `rate_limit_hour_${email}`;

    if (!global.rateLimitStore) {
      global.rateLimitStore = new Map();
    }

    // Check minute limit
    const minuteCount = global.rateLimitStore.get(minuteKey) || 0;
    if (minuteCount >= this.config.rateLimitPerMinute) {
      return false;
    }

    // Check hour limit
    const hourCount = global.rateLimitStore.get(hourKey) || 0;
    if (hourCount >= this.config.rateLimitPerHour) {
      return false;
    }

    // Update counters
    global.rateLimitStore.set(minuteKey, minuteCount + 1);
    global.rateLimitStore.set(hourKey, hourCount + 1);

    // Clean up old entries
    setTimeout(() => {
      global.rateLimitStore?.delete(minuteKey);
    }, 60000); // 1 minute

    setTimeout(() => {
      global.rateLimitStore?.delete(hourKey);
    }, 3600000); // 1 hour

    return true;
  }

  /**
   * Simulate email sending (replace with actual email service)
   */
  private async sendEmail(emailLog: any): Promise<boolean> {
    try {
      // Simulate email sending with random success/failure
      const success = Math.random() > 0.1; // 90% success rate
      
      if (success) {
        // Simulate delivery delay
        await this.delay(Math.random() * 2000 + 500); // 0.5-2.5 seconds
        
        // Update to delivered
        await this.prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date()
          }
        });
      }

      return success;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    try {
      const [
        totalQueued,
        totalProcessed,
        totalFailed,
        currentQueueSize,
        failedEmails,
        retryQueueSize
      ] = await Promise.all([
        this.prisma.emailLog.count(),
        this.prisma.emailLog.count({ where: { status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] } } }),
        this.prisma.emailLog.count({ where: { status: 'FAILED' } }),
        this.prisma.emailLog.count({ where: { status: 'PENDING' } }),
        this.prisma.emailLog.count({ where: { status: 'FAILED' } }),
        this.prisma.emailLog.count({ where: { retryCount: { gt: 0 } } })
      ]);

      // Calculate average processing time (simplified)
      const averageProcessingTime = 2000; // 2 seconds average

      return {
        totalQueued,
        totalProcessed,
        totalFailed,
        averageProcessingTime,
        currentQueueSize,
        processingEmails: this.processingEmails.size,
        failedEmails,
        retryQueueSize
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return {
        totalQueued: 0,
        totalProcessed: 0,
        totalFailed: 0,
        averageProcessingTime: 0,
        currentQueueSize: 0,
        processingEmails: 0,
        failedEmails: 0,
        retryQueueSize: 0
      };
    }
  }

  /**
   * Clear failed emails
   */
  async clearFailedEmails(): Promise<number> {
    try {
      const result = await this.prisma.emailLog.deleteMany({
        where: {
          status: 'FAILED',
          retryCount: { gte: this.config.maxRetries }
        }
      });

      return result.count;
    } catch (error) {
      console.error('Error clearing failed emails:', error);
      throw new Error('Failed to clear failed emails');
    }
  }

  /**
   * Retry failed emails
   */
  async retryFailedEmails(): Promise<number> {
    try {
      const failedEmails = await this.prisma.emailLog.findMany({
        where: {
          status: 'FAILED',
          retryCount: { lt: this.config.maxRetries }
        }
      });

      let retryCount = 0;
      for (const email of failedEmails) {
        try {
          await this.prisma.emailLog.update({
            where: { id: email.id },
            data: {
              status: 'PENDING',
              retryCount: 0
            }
          });
          retryCount++;
        } catch (error) {
          console.error(`Error retrying email ${email.id}:`, error);
        }
      }

      // Start processing if not already running
      if (retryCount > 0 && !this.isProcessing) {
        this.processQueue();
      }

      return retryCount;
    } catch (error) {
      console.error('Error retrying failed emails:', error);
      throw new Error('Failed to retry failed emails');
    }
  }

  /**
   * Pause queue processing
   */
  pauseQueue(): void {
    this.isProcessing = false;
  }

  /**
   * Resume queue processing
   */
  resumeQueue(): void {
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global type declaration for rate limiting
declare global {
  var rateLimitStore: Map<string, number> | undefined;
}
