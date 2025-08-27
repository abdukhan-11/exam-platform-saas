import { PrismaClient } from '@prisma/client';

export interface ComplianceConfig {
  gdprEnabled: boolean;
  requireUnsubscribeLink: boolean;
  spamPreventionEnabled: boolean;
  doubleOptInRequired: boolean;
  dataRetentionDays: number;
  allowMarketingEmails: boolean;
  allowTransactionalEmails: boolean;
  allowNotificationEmails: boolean;
}

export interface UnsubscribeRecord {
  id: string;
  email: string;
  reason?: string;
  source: string; // Which email/template triggered the unsubscribe
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  collegeId?: string;
  userId?: string;
}

export interface ComplianceReport {
  totalEmails: number;
  gdprCompliant: number;
  unsubscribed: number;
  spamReports: number;
  dataRetentionCompliant: number;
  complianceScore: number;
  lastAudit: Date;
}

export interface EmailLogWhere {
  collegeId?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  metadata?: {
    path?: string[];
    equals?: boolean;
  };
}

export class EmailComplianceService {
  private prisma: PrismaClient;
  private config: ComplianceConfig;

  constructor(prisma: PrismaClient, config?: Partial<ComplianceConfig>) {
    this.prisma = prisma;
    this.config = {
      gdprEnabled: true,
      requireUnsubscribeLink: true,
      spamPreventionEnabled: true,
      doubleOptInRequired: false,
      dataRetentionDays: 2555, // 7 years
      allowMarketingEmails: true,
      allowTransactionalEmails: true,
      allowNotificationEmails: true,
      ...config
    };
  }

  /**
   * Check if email can be sent based on compliance rules
   */
  async canSendEmail(email: string, emailType: 'marketing' | 'transactional' | 'notification', userId?: string, collegeId?: string): Promise<{
    canSend: boolean;
    reason?: string;
    complianceIssues: string[];
  }> {
    const complianceIssues: string[] = [];

    try {
      // Check if user has unsubscribed
      const isUnsubscribed = await this.isEmailUnsubscribed(email);
      if (isUnsubscribed) {
        return {
          canSend: false,
          reason: 'Email address has unsubscribed',
          complianceIssues: ['unsubscribed']
        };
      }

      // Check GDPR compliance if enabled
      if (this.config.gdprEnabled) {
        const gdprCompliant = await this.checkGDPRCompliance(userId, collegeId);
        if (!gdprCompliant.compliant) {
          complianceIssues.push('gdpr_non_compliant');
          if (gdprCompliant.reason === 'no_consent') {
            return {
              canSend: false,
              reason: 'No GDPR consent given',
              complianceIssues
            };
          }
        }
      }

      // Check email type restrictions
      if (emailType === 'marketing' && !this.config.allowMarketingEmails) {
        return {
          canSend: false,
          reason: 'Marketing emails not allowed',
          complianceIssues: ['marketing_not_allowed']
        };
      }

      if (emailType === 'transactional' && !this.config.allowTransactionalEmails) {
        return {
          canSend: false,
          reason: 'Transactional emails not allowed',
          complianceIssues: ['transactional_not_allowed']
        };
      }

      if (emailType === 'notification' && !this.config.allowNotificationEmails) {
        return {
          canSend: false,
          reason: 'Notification emails not allowed',
          complianceIssues: ['notification_not_allowed']
        };
      }

      // Check spam prevention if enabled
      if (this.config.spamPreventionEnabled) {
        const spamCheck = await this.checkSpamPrevention(email, userId, collegeId);
        if (spamCheck.isSpam) {
          return {
            canSend: false,
            reason: 'Email flagged as potential spam',
            complianceIssues: ['spam_detected']
          };
        }
      }

      return {
        canSend: true,
        complianceIssues
      };
    } catch (error) {
      console.error('Error checking email compliance:', error);
      return {
        canSend: false,
        reason: 'Error checking compliance',
        complianceIssues: ['compliance_check_error']
      };
    }
  }

  /**
   * Check if email is unsubscribed
   */
  async isEmailUnsubscribed(email: string): Promise<boolean> {
    try {
      // For now, return false since we don't have an unsubscribe table
      // In a real implementation, this would query the database
      return false;
    } catch (error) {
      console.error('Error checking unsubscribe status:', error);
      return false;
    }
  }

  /**
   * Record unsubscribe request
   */
  async recordUnsubscribe(email: string, reason?: string): Promise<void> {
    try {
      // For now, just log the unsubscribe
      // In a real implementation, this would store in the database
      console.log(`Unsubscribe recorded for ${email}: ${reason || 'No reason provided'}`);
      
      // You would typically store this in an unsubscribe table:
      // await this.prisma.unsubscribeRecord.create({
      //   data: {
      //     email,
      //     reason,
      //     source: source || 'unknown',
      //     timestamp: new Date(),
      //     ipAddress,
      //     userAgent,
      //     collegeId,
      //     userId
      //   }
      // });
    } catch (error) {
      console.error('Error recording unsubscribe:', error);
      throw new Error('Failed to record unsubscribe');
    }
  }

  /**
   * Check GDPR compliance
   */
  async checkGDPRCompliance(userId?: string, collegeId?: string): Promise<{
    compliant: boolean;
    reason?: string;
    details: string[];
  }> {
    try {
      const details: string[] = [];

      // Check if user exists and has given consent
      if (userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { 
            email: true,
            role: true,
            isActive: true
          }
        });

        if (user) {
          // For now, assume all active users have consent
          // In a real implementation, you'd check actual consent fields
          if (!user.isActive) {
            return {
              compliant: false,
              reason: 'inactive_user',
              details: ['User account is inactive']
            };
          }
          
          details.push(`User active: ${user.isActive}`);
        }
      }

      // Check college-level compliance
      if (collegeId) {
        const college = await this.prisma.college.findUnique({
          where: { id: collegeId },
          select: { 
            name: true, 
            isActive: true, 
            subscriptionExpiry: true 
          }
        });

        if (college) {
          // For now, assume all active colleges are compliant
          // In a real implementation, you'd check actual GDPR fields
          if (!college.isActive) {
            details.push('College account is inactive');
          }
          
          details.push(`College active: ${college.isActive}`);
          details.push(`Subscription expiry: ${college.subscriptionExpiry ? college.subscriptionExpiry.toISOString() : 'none'}`);
        }
      }

      // For now, assume compliant if no issues found
      // In a real implementation, you'd have more comprehensive checks
      return {
        compliant: true,
        details
      };
    } catch (error) {
      console.error('Error checking GDPR compliance:', error);
      return {
        compliant: false,
        reason: 'error',
        details: ['Error checking GDPR compliance']
      };
    }
  }

  /**
   * Check spam prevention
   */
  async checkSpamPrevention(email: string, userId?: string, collegeId?: string): Promise<{
    isSpam: boolean;
    score: number;
    reasons: string[];
  }> {
    try {
      let score = 0;
      const reasons: string[] = [];

      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        score += 10;
        reasons.push('Invalid email format');
      }

      // Check for disposable email domains
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
        'mailinator.com', 'temp-mail.org', 'throwaway.email'
      ];
      
      const domain = email.split('@')[1]?.toLowerCase();
      if (domain && disposableDomains.includes(domain)) {
        score += 20;
        reasons.push('Disposable email domain');
      }

      // Check user history if available
      if (userId) {
        const userEmailHistory = await this.prisma.emailLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10
        });

        const recentFailures = userEmailHistory.filter(log => 
          log.status === 'FAILED' || log.status === 'BOUNCED'
        ).length;

        if (recentFailures > 5) {
          score += 15;
          reasons.push('High failure rate');
        }
      }

      // Check college reputation
      if (collegeId) {
        const collegeEmailHistory = await this.prisma.emailLog.findMany({
          where: { collegeId },
          orderBy: { createdAt: 'desc' },
          take: 100
        });

        const totalEmails = collegeEmailHistory.length;
        const failedEmails = collegeEmailHistory.filter(log => 
          log.status === 'FAILED' || log.status === 'BOUNCED'
        ).length;

        if (totalEmails > 0) {
          const failureRate = (failedEmails / totalEmails) * 100;
          if (failureRate > 20) {
            score += 25;
            reasons.push('High college failure rate');
          }
        }
      }

      // Threshold for spam detection
      const isSpam = score >= 30;

      return {
        isSpam,
        score,
        reasons
      };
    } catch (error) {
      console.error('Error checking spam prevention:', error);
      return {
        isSpam: false,
        score: 0,
        reasons: ['Error checking spam prevention']
      };
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(collegeId?: string, startDate?: Date, endDate?: Date): Promise<ComplianceReport> {
    try {
      const where: EmailLogWhere = {};
      if (collegeId) where.collegeId = collegeId;
      if (startDate) where.createdAt = { gte: startDate };
      if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

      const [
        totalEmails,
        gdprCompliant,
        unsubscribed,
        spamReports,
        dataRetentionCompliant
      ] = await Promise.all([
        this.prisma.emailLog.count({ where }),
        // For now, assume all emails are GDPR compliant since we don't have metadata tracking
        this.prisma.emailLog.count({ where }),
        // For now, assume no unsubscribes since we don't have unsubscribe tracking
        0,
        // For now, assume no spam reports since we don't have spam tracking
        0,
        this.prisma.emailLog.count({ where: { ...where, createdAt: { gte: new Date(Date.now() - this.config.dataRetentionDays * 24 * 60 * 60 * 1000) } } })
      ]);

      const complianceScore = totalEmails > 0 ? 
        ((gdprCompliant + dataRetentionCompliant) / (totalEmails * 2)) * 100 : 100;

      return {
        totalEmails,
        gdprCompliant,
        unsubscribed,
        spamReports,
        dataRetentionCompliant,
        complianceScore: Math.round(complianceScore * 100) / 100,
        lastAudit: new Date()
      };
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw new Error('Failed to generate compliance report');
    }
  }

  /**
   * Clean up old data for compliance
   */
  async cleanupOldData(): Promise<{
    deletedEmails: number;
    deletedUnsubscribes: number;
    deletedLogs: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.dataRetentionDays);

      // Delete old email logs
      const deletedEmails = await this.prisma.emailLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          status: { in: ['SENT', 'DELIVERED', 'FAILED', 'BOUNCED'] }
        }
      });

      // In a real implementation, you'd also clean up other related data
      const deletedUnsubscribes = 0; // Would clean up unsubscribe records
      const deletedLogs = 0; // Would clean up other logs

      return {
        deletedEmails: deletedEmails.count,
        deletedUnsubscribes,
        deletedLogs
      };
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      throw new Error('Failed to clean up old data');
    }
  }

  /**
   * Update compliance configuration
   */
  updateComplianceConfig(newConfig: Partial<ComplianceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current compliance configuration
   */
  getComplianceConfig(): ComplianceConfig {
    return { ...this.config };
  }

  /**
   * Validate compliance configuration
   */
  validateComplianceConfig(config: ComplianceConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.gdprEnabled && config.dataRetentionDays < 2555) {
      warnings.push('GDPR enabled but data retention is less than 7 years');
    }

    if (config.requireUnsubscribeLink && !config.gdprEnabled) {
      warnings.push('Unsubscribe link required but GDPR not enabled');
    }

    if (config.spamPreventionEnabled && config.allowMarketingEmails) {
      warnings.push('Spam prevention enabled for marketing emails');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
