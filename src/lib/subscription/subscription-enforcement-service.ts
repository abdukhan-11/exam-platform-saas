import { prisma } from '@/lib/db';
import { EmailService } from '@/lib/email/email-service';
import { ActivityLogger } from '@/lib/user-management/activity-logger';

export interface SubscriptionTier {
  name: string;
  maxUsers: number;
  maxExams: number;
  maxStorageGB: number;
  features: string[];
  price: number;
  billingCycle: 'monthly' | 'quarterly' | 'annually';
  gracePeriodDays: number;
}

export interface SubscriptionViolation {
  collegeId: string;
  collegeName: string;
  violationType: 'USER_LIMIT' | 'EXAM_LIMIT' | 'STORAGE_LIMIT' | 'PAYMENT_OVERDUE' | 'FEATURE_ACCESS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  currentValue: number;
  limit: number;
  detectedAt: Date;
}

export interface ComplianceReport {
  collegeId: string;
  collegeName: string;
  subscriptionStatus: string;
  violations: SubscriptionViolation[];
  lastPaymentDate: Date | null;
  nextBillingDate: Date | null;
  daysUntilExpiry: number;
  complianceScore: number; // 0-100
  recommendations: string[];
}

export class SubscriptionEnforcementService {
  private emailService: EmailService;
  private activityLogger: ActivityLogger;

  constructor() {
    // Initialize email service with default config
    this.emailService = new EmailService({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'noreply@exam-saas.com',
        pass: 'password'
      },
      from: 'noreply@exam-saas.com'
    }, prisma);
    
    this.activityLogger = new ActivityLogger(prisma);
  }

  // Subscription tier definitions
  private readonly subscriptionTiers: Record<string, SubscriptionTier> = {
    TRIAL: {
      name: 'Trial',
      maxUsers: 5,
      maxExams: 10,
      maxStorageGB: 1,
      features: ['Basic Features', 'Email Support'],
      price: 0,
      billingCycle: 'monthly',
      gracePeriodDays: 7
    },
    BASIC: {
      name: 'Basic',
      maxUsers: 50,
      maxExams: 100,
      maxStorageGB: 10,
      features: ['Basic Features', 'Basic Analytics', 'Email Support'],
      price: 99,
      billingCycle: 'monthly',
      gracePeriodDays: 14
    },
    STANDARD: {
      name: 'Standard',
      maxUsers: 200,
      maxExams: 500,
      maxStorageGB: 50,
      features: ['Basic Features', 'Advanced Analytics', 'API Access', 'Email Support'],
      price: 199,
      billingCycle: 'monthly',
      gracePeriodDays: 21
    },
    PREMIUM: {
      name: 'Premium',
      maxUsers: 1000,
      maxExams: 2500,
      maxStorageGB: 200,
      features: ['All Features', 'Advanced Analytics', 'API Access', 'Priority Support', 'Custom Integrations'],
      price: 299,
      billingCycle: 'monthly',
      gracePeriodDays: 30
    },
    ENTERPRISE: {
      name: 'Enterprise',
      maxUsers: -1, // Unlimited
      maxExams: -1, // Unlimited
      maxStorageGB: 1000,
      features: ['All Features', 'Unlimited Users', 'Custom Features', 'Dedicated Support', 'SLA Guarantee'],
      price: 599,
      billingCycle: 'monthly',
      gracePeriodDays: 45
    }
  };

  /**
   * Main enforcement method - runs daily to check and enforce subscription compliance
   */
  async enforceSubscriptions(): Promise<void> {
    try {
      console.log('Starting subscription enforcement process...');
      
      // Get all colleges
      const colleges = await prisma.college.findMany({
        include: {
          users: true,
          exams: true
        }
      });

      for (const college of colleges) {
        await this.enforceCollegeSubscription(college);
      }

      console.log('Subscription enforcement process completed');
    } catch (error) {
      console.error('Error in subscription enforcement:', error);
      throw error;
    }
  }

  /**
   * Enforce subscription for a specific college
   */
  private async enforceCollegeSubscription(college: any): Promise<void> {
    try {
      const tier = this.subscriptionTiers[college.subscriptionStatus] || this.subscriptionTiers.TRIAL;
      const violations = await this.detectViolations(college, tier);
      
      if (violations.length > 0) {
        await this.handleViolations(college, violations);
      }

      // Check subscription expiry
      if (college.subscriptionExpiry && college.subscriptionExpiry < new Date()) {
        await this.handleExpiredSubscription(college);
      }

      // Check grace period
      if (college.subscriptionExpiry) {
        const gracePeriodEnd = new Date(college.subscriptionExpiry.getTime() + (tier.gracePeriodDays * 24 * 60 * 60 * 1000));
        if (gracePeriodEnd < new Date()) {
          await this.handleGracePeriodExpired(college);
        }
      }

      // Log activity
      await this.activityLogger.logActivity({
        userId: 'SYSTEM',
        action: 'SUBSCRIPTION_ENFORCEMENT_CHECK',
        resourceType: 'COLLEGE',
        resourceId: college.id,
        details: {
          violations: violations.length,
          status: college.subscriptionStatus,
          expiry: college.subscriptionExpiry
        }
      });

    } catch (error) {
      console.error(`Error enforcing subscription for college ${college.id}:`, error);
    }
  }

  /**
   * Detect subscription violations for a college
   */
  private async detectViolations(college: any, tier: SubscriptionTier): Promise<SubscriptionViolation[]> {
    const violations: SubscriptionViolation[] = [];

    // Check user limit
    if (tier.maxUsers > 0 && college.users.length > tier.maxUsers) {
      violations.push({
        collegeId: college.id,
        collegeName: college.name,
        violationType: 'USER_LIMIT',
        severity: 'HIGH',
        description: `User limit exceeded: ${college.users.length}/${tier.maxUsers}`,
        currentValue: college.users.length,
        limit: tier.maxUsers,
        detectedAt: new Date()
      });
    }

    // Check exam limit
    if (tier.maxExams > 0 && college.exams.length > tier.maxExams) {
      violations.push({
        collegeId: college.id,
        collegeName: college.name,
        violationType: 'EXAM_LIMIT',
        severity: 'MEDIUM',
        description: `Exam limit exceeded: ${college.exams.length}/${tier.maxExams}`,
        currentValue: college.exams.length,
        limit: tier.maxExams,
        detectedAt: new Date()
      });
    }

    // Check storage limit (placeholder - would need actual storage tracking)
    // This is a simplified check - in production you'd query actual storage usage
    const estimatedStorageGB = college.exams.length * 0.1; // Rough estimate
    if (tier.maxStorageGB > 0 && estimatedStorageGB > tier.maxStorageGB) {
      violations.push({
        collegeId: college.id,
        collegeName: college.name,
        violationType: 'STORAGE_LIMIT',
        severity: 'MEDIUM',
        description: `Storage limit exceeded: ${estimatedStorageGB.toFixed(1)}GB/${tier.maxStorageGB}GB`,
        currentValue: estimatedStorageGB,
        limit: tier.maxStorageGB,
        detectedAt: new Date()
      });
    }

    return violations;
  }

  /**
   * Handle detected violations
   */
  private async handleViolations(college: any, violations: SubscriptionViolation[]): Promise<void> {
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    const highViolations = violations.filter(v => v.severity === 'HIGH');

    // Send violation notifications
    await this.sendViolationNotifications(college, violations);

    // For critical violations, immediately suspend access to premium features
    if (criticalViolations.length > 0) {
      await this.suspendPremiumFeatures(college);
    }

    // For high violations, send warnings and set grace period
    if (highViolations.length > 0) {
      await this.setViolationGracePeriod(college, violations);
    }

    // Log violations
    await this.logViolations(college, violations);
  }

  /**
   * Handle expired subscription
   */
  private async handleExpiredSubscription(college: any): Promise<void> {
    // Update subscription status
    await prisma.college.update({
      where: { id: college.id },
      data: {
        subscriptionStatus: 'EXPIRED',
        isActive: false
      }
    });

    // Send expiry notification
    await this.sendExpiryNotification(college);

    // Suspend all premium features
    await this.suspendPremiumFeatures(college);

    // Log the action
    await this.activityLogger.logActivity({
      userId: 'SYSTEM',
      action: 'SUBSCRIPTION_EXPIRED',
      resourceType: 'COLLEGE',
      resourceId: college.id,
      details: {
        previousStatus: college.subscriptionStatus,
        expiryDate: college.subscriptionExpiry
      }
    });
  }

  /**
   * Handle grace period expiration
   */
  private async handleGracePeriodExpired(college: any): Promise<void> {
    // Suspend the college completely
    await prisma.college.update({
      where: { id: college.id },
      data: {
        isActive: false
      }
    });

    // Send suspension notification
    await this.sendSuspensionNotification(college);

    // Log the action
    await this.activityLogger.logActivity({
      userId: 'SYSTEM',
      action: 'COLLEGE_SUSPENDED',
      resourceType: 'COLLEGE',
      resourceId: college.id,
      details: {
        reason: 'Grace period expired',
        previousStatus: college.subscriptionStatus
      }
    });
  }

  /**
   * Suspend premium features for a college
   */
  private async suspendPremiumFeatures(college: any): Promise<void> {
    // This would involve updating feature flags or access controls
    // For now, we'll just log the action
    console.log(`Suspending premium features for college: ${college.name}`);
    
    // In a real implementation, you might:
    // - Update feature flags in Redis/Cache
    // - Modify API responses to restrict access
    // - Update UI components to hide premium features
  }

  /**
   * Set violation grace period
   */
  private async setViolationGracePeriod(college: any, violations: SubscriptionViolation[]): Promise<void> {
    // Set a grace period for the college to resolve violations
    const gracePeriodDays = 7; // 7 days to resolve violations
    
    await prisma.college.update({
      where: { id: college.id },
      data: {
        subscriptionExpiry: new Date(Date.now() + (gracePeriodDays * 24 * 60 * 60 * 1000))
      }
    });
  }

  /**
   * Send violation notifications
   */
  private async sendViolationNotifications(college: any, violations: SubscriptionViolation[]): Promise<void> {
    try {
      // Get college admin users
      const adminUsers = await prisma.user.findMany({
        where: {
          collegeId: college.id,
          role: { in: ['COLLEGE_ADMIN', 'SUPER_ADMIN'] }
        }
      });

      for (const user of adminUsers) {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Subscription Violation Alert</h2>
            <p>Dear Admin,</p>
            <p>Your subscription for <strong>${college.name}</strong> has violations that require attention.</p>
            <p><strong>Number of Violations:</strong> ${violations.length}</p>
            <p><strong>Critical Violations:</strong> ${violations.filter(v => v.severity === 'CRITICAL').length}</p>
            <p><strong>High Priority Violations:</strong> ${violations.filter(v => v.severity === 'HIGH').length}</p>
            <p>Please resolve these issues to avoid service interruption.</p>
          </div>
        `;

        await this.emailService.sendEmail({
          to: user.email,
          subject: `Subscription Violation Alert - ${college.name}`,
          html,
          text: `Subscription Violation Alert for ${college.name}. ${violations.length} violations detected.`,
          template: 'violation-alert',
          metadata: {
            collegeName: college.name,
            violations: violations,
            actionRequired: violations.some(v => v.severity === 'CRITICAL' || v.severity === 'HIGH')
          },
          collegeId: college.id
        });
      }
    } catch (error) {
      console.error('Error sending violation notifications:', error);
    }
  }

  /**
   * Send expiry notification
   */
  private async sendExpiryNotification(college: any): Promise<void> {
    try {
      const adminUsers = await prisma.user.findMany({
        where: {
          collegeId: college.id,
          role: { in: ['COLLEGE_ADMIN', 'SUPER_ADMIN'] }
        }
      });

      for (const user of adminUsers) {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Subscription Expired</h2>
            <p>Dear Admin,</p>
            <p>Your subscription for <strong>${college.name}</strong> has expired.</p>
            <p><strong>Expiry Date:</strong> ${college.subscriptionExpiry?.toLocaleDateString() || 'Unknown'}</p>
            <p>Please renew your subscription to continue using our services.</p>
          </div>
        `;

        await this.emailService.sendEmail({
          to: user.email,
          subject: `Subscription Expired - ${college.name}`,
          html,
          text: `Subscription Expired for ${college.name}. Please renew to continue.`,
          template: 'subscription-expired',
          metadata: {
            collegeName: college.name,
            expiryDate: college.subscriptionExpiry
          },
          collegeId: college.id
        });
      }
    } catch (error) {
      console.error('Error sending expiry notification:', error);
    }
  }

  /**
   * Send suspension notification
   */
  private async sendSuspensionNotification(college: any): Promise<void> {
    try {
      const adminUsers = await prisma.user.findMany({
        where: {
          collegeId: college.id,
          role: { in: ['COLLEGE_ADMIN', 'SUPER_ADMIN'] }
        }
      });

      for (const user of adminUsers) {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Account Suspended</h2>
            <p>Dear Admin,</p>
            <p>Your account for <strong>${college.name}</strong> has been suspended.</p>
            <p><strong>Reason:</strong> Grace period expired after subscription violations</p>
            <p>Please contact support to resolve this issue and restore your account.</p>
          </div>
        `;

        await this.emailService.sendEmail({
          to: user.email,
          subject: `Account Suspended - ${college.name}`,
          html,
          text: `Account Suspended for ${college.name}. Reason: Grace period expired after subscription violations.`,
          template: 'account-suspended',
          metadata: {
            collegeName: college.name,
            reason: 'Grace period expired after subscription violations'
          },
          collegeId: college.id
        });
      }
    } catch (error) {
      console.error('Error sending suspension notification:', error);
    }
  }

  /**
   * Log violations for audit purposes
   */
  private async logViolations(college: any, violations: SubscriptionViolation[]): Promise<void> {
    // This would typically go to a dedicated audit log or compliance system
    // For now, we'll use the activity logger
    for (const violation of violations) {
      await this.activityLogger.logActivity({
        userId: 'SYSTEM',
        action: 'SUBSCRIPTION_VIOLATION',
        resourceType: 'SUBSCRIPTION_VIOLATION',
        resourceId: violation.collegeId,
        details: {
          violationType: violation.violationType,
          severity: violation.severity,
          description: violation.description,
          currentValue: violation.currentValue,
          limit: violation.limit
        }
      });
    }
  }

  /**
   * Generate compliance report for a college
   */
  async generateComplianceReport(collegeId: string): Promise<ComplianceReport> {
    const college = await prisma.college.findUnique({
      where: { id: collegeId },
      include: {
        users: true,
        exams: true
      }
    });

    if (!college) {
      throw new Error('College not found');
    }

    const tier = this.subscriptionTiers[college.subscriptionStatus] || this.subscriptionTiers.TRIAL;
    const violations = await this.detectViolations(college, tier);
    
    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(college, violations, tier);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(violations, tier);

    return {
      collegeId: college.id,
      collegeName: college.name,
      subscriptionStatus: college.subscriptionStatus,
      violations,
      lastPaymentDate: null, // Would come from payment system
      nextBillingDate: college.subscriptionExpiry,
      daysUntilExpiry: college.subscriptionExpiry ? 
        Math.ceil((college.subscriptionExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
      complianceScore,
      recommendations
    };
  }

  /**
   * Calculate compliance score (0-100)
   */
  private calculateComplianceScore(college: any, violations: SubscriptionViolation[], tier: SubscriptionTier): number {
    let score = 100;

    // Deduct points for violations
    for (const violation of violations) {
      switch (violation.severity) {
        case 'CRITICAL':
          score -= 30;
          break;
        case 'HIGH':
          score -= 20;
          break;
        case 'MEDIUM':
          score -= 10;
          break;
        case 'LOW':
          score -= 5;
          break;
      }
    }

    // Deduct points for approaching limits
    if (tier.maxUsers > 0) {
      const userUsagePercent = (college.users.length / tier.maxUsers) * 100;
      if (userUsagePercent > 90) score -= 10;
      else if (userUsagePercent > 80) score -= 5;
    }

    if (tier.maxExams > 0) {
      const examUsagePercent = (college.exams.length / tier.maxExams) * 100;
      if (examUsagePercent > 90) score -= 10;
      else if (examUsagePercent > 80) score -= 5;
    }

    // Deduct points for expired subscription
    if (college.subscriptionExpiry && college.subscriptionExpiry < new Date()) {
      score -= 40;
    }

    return Math.max(0, score);
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: SubscriptionViolation[], tier: SubscriptionTier): string[] {
    const recommendations: string[] = [];

    for (const violation of violations) {
      switch (violation.violationType) {
        case 'USER_LIMIT':
          recommendations.push(`Upgrade to a higher tier to support more users (current: ${violation.currentValue}, limit: ${violation.limit})`);
          break;
        case 'EXAM_LIMIT':
          recommendations.push(`Consider upgrading to ${tier.name} tier for more exam capacity`);
          break;
        case 'STORAGE_LIMIT':
          recommendations.push(`Upgrade storage plan or clean up unused data`);
          break;
        case 'PAYMENT_OVERDUE':
          recommendations.push('Update payment method to avoid service interruption');
          break;
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('All subscription limits are within acceptable ranges');
    }

    return recommendations;
  }

  /**
   * Get subscription tier information
   */
  getSubscriptionTier(tierName: string): SubscriptionTier | null {
    return this.subscriptionTiers[tierName] || null;
  }

  /**
   * Get all available subscription tiers
   */
  getAllSubscriptionTiers(): Record<string, SubscriptionTier> {
    return { ...this.subscriptionTiers };
  }
}