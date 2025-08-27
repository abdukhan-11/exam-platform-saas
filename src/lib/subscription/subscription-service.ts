import { SubscriptionEnforcementService } from './subscription-enforcement-service';
import { SubscriptionLifecycleService } from './subscription-lifecycle-service';
import { SubscriptionComplianceService } from './subscription-compliance-service';
import { FeatureAccessControlService } from './feature-access-control';

export interface SubscriptionSummary {
  collegeId: string;
  collegeName: string;
  subscriptionStatus: string;
  subscriptionTier: string;
  isActive: boolean;
  subscriptionExpiry: Date | null;
  daysUntilExpiry: number;
  complianceScore: number;
  violations: number;
  features: string[];
  usage: {
    users: number;
    exams: number;
    storageGB: number;
  };
}

export interface SubscriptionAnalytics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  averageComplianceScore: number;
  topViolations: string[];
  subscriptionDistribution: Record<string, number>;
  revenueTrends: Array<{
    month: string;
    revenue: number;
    subscriptions: number;
  }>;
}

export class SubscriptionService {
  private enforcementService: SubscriptionEnforcementService;
  private lifecycleService: SubscriptionLifecycleService;
  private complianceService: SubscriptionComplianceService;
  private featureAccessService: FeatureAccessControlService;

  constructor() {
    this.enforcementService = new SubscriptionEnforcementService();
    this.lifecycleService = new SubscriptionLifecycleService();
    this.complianceService = new SubscriptionComplianceService();
    this.featureAccessService = new FeatureAccessControlService();
  }

  /**
   * Initialize subscription system for a new college
   */
  async initializeCollegeSubscription(collegeId: string, tier: string = 'TRIAL'): Promise<void> {
    try {
      // Set initial subscription status
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 days trial

      await this.updateCollegeSubscription(collegeId, {
        status: tier,
        expiryDate,
        isActive: true
      });

      // Send welcome email
      await this.sendWelcomeEmail(collegeId, tier);

      console.log(`Initialized ${tier} subscription for college: ${collegeId}`);
    } catch (error) {
      console.error('Error initializing college subscription:', error);
      throw error;
    }
  }

  /**
   * Update college subscription
   */
  async updateCollegeSubscription(collegeId: string, updates: {
    status?: string;
    expiryDate?: Date;
    isActive?: boolean;
  }): Promise<void> {
    try {
      const { prisma } = await import('@/lib/db');
      
      await prisma.college.update({
        where: { id: collegeId },
        data: {
          subscriptionStatus: updates.status,
          subscriptionExpiry: updates.expiryDate,
          isActive: updates.isActive
        }
      });

      // Log the update
      const { ActivityLogger } = await import('@/lib/user-management/activity-logger');
      const activityLogger = new ActivityLogger(prisma);
      
      await activityLogger.logActivity({
        userId: 'SYSTEM',
        action: 'SUBSCRIPTION_UPDATED',
        resourceType: 'SUBSCRIPTION',
        resourceId: collegeId,
        details: updates
      });
    } catch (error) {
      console.error('Error updating college subscription:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive subscription summary for a college
   */
  async getSubscriptionSummary(collegeId: string): Promise<SubscriptionSummary> {
    try {
      const { prisma } = await import('@/lib/db');
      
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

      const complianceReport = await this.complianceService.generateCollegeComplianceReport(collegeId);
      const availableFeatures = await this.featureAccessService.getAvailableFeatures(collegeId);
      const featureNames = availableFeatures.map(f => f.featureName);

      const daysUntilExpiry = college.subscriptionExpiry ? 
        Math.ceil((college.subscriptionExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

      // Estimate storage usage (simplified)
      const estimatedStorageGB = college.exams.length * 0.1;

      return {
        collegeId: college.id,
        collegeName: college.name,
        subscriptionStatus: college.subscriptionStatus,
        subscriptionTier: college.subscriptionStatus,
        isActive: college.isActive,
        subscriptionExpiry: college.subscriptionExpiry,
        daysUntilExpiry,
        complianceScore: complianceReport.complianceScore,
        violations: complianceReport.violations.length,
        features: featureNames,
        usage: {
          users: college.users.length,
          exams: college.exams.length,
          storageGB: estimatedStorageGB
        }
      };
    } catch (error) {
      console.error('Error getting subscription summary:', error);
      throw error;
    }
  }

  /**
   * Get subscription analytics for all colleges
   */
  async getSubscriptionAnalytics(): Promise<SubscriptionAnalytics> {
    try {
      const { prisma } = await import('@/lib/db');
      
      const colleges = await prisma.college.findMany({
        select: {
          subscriptionStatus: true,
          isActive: true
        }
      });

      // Calculate basic metrics
      const activeSubscriptions = colleges.filter(c => c.isActive).length;
      const totalColleges = colleges.length;
      const churnRate = totalColleges > 0 ? ((totalColleges - activeSubscriptions) / totalColleges) * 100 : 0;

      // Calculate revenue (simplified)
      const tierPricing = {
        'TRIAL': 0,
        'BASIC': 99,
        'STANDARD': 199,
        'PREMIUM': 299,
        'ENTERPRISE': 599
      };

      const totalRevenue = colleges.reduce((sum, college) => {
        if (college.isActive) {
          return sum + (tierPricing[college.subscriptionStatus as keyof typeof tierPricing] || 0);
        }
        return sum;
      }, 0);

      const monthlyRecurringRevenue = totalRevenue;

      // Get compliance overview
      const globalReport = await this.complianceService.generateGlobalComplianceReport();
      const averageComplianceScore = globalReport.metrics?.averageComplianceScore || 85;

      // Get top violations
      const topViolations = globalReport.topViolations
        .slice(0, 5)
        .map(v => `${v.violationType}: ${v.collegeName}`);

      // Calculate subscription distribution
      const subscriptionDistribution: Record<string, number> = {};
      colleges.forEach(college => {
        const tier = college.subscriptionStatus;
        subscriptionDistribution[tier] = (subscriptionDistribution[tier] || 0) + 1;
      });

      // Generate revenue trends (mock data for now)
      const revenueTrends = this.generateMockRevenueTrends();

      return {
        totalRevenue,
        monthlyRecurringRevenue,
        activeSubscriptions,
        churnRate: Math.round(churnRate * 100) / 100,
        averageComplianceScore,
        topViolations,
        subscriptionDistribution,
        revenueTrends
      };
    } catch (error) {
      console.error('Error getting subscription analytics:', error);
      throw error;
    }
  }

  /**
   * Run daily subscription maintenance tasks
   */
  async runDailyMaintenance(): Promise<void> {
    try {
      console.log('Starting daily subscription maintenance...');

      // 1. Enforce subscriptions
      await this.enforcementService.enforceSubscriptions();

      // 2. Process billing cycles
      await this.lifecycleService.processBillingCycles();

      // 3. Send renewal reminders
      await this.lifecycleService.sendRenewalReminders();

      // 4. Monitor compliance
      await this.complianceService.monitorCompliance();

      console.log('Daily subscription maintenance completed');
    } catch (error) {
      console.error('Error in daily subscription maintenance:', error);
      throw error;
    }
  }

  /**
   * Process subscription upgrade/downgrade
   */
  async changeSubscriptionTier(collegeId: string, newTier: string, effectiveDate: Date = new Date()): Promise<void> {
    try {
      // Validate tier change
      const upgradeCheck = await this.featureAccessService.checkUpgradeRequired(collegeId, 'basic-exam-creation');
      
      if (upgradeCheck.upgradeRequired && newTier === upgradeCheck.currentTier) {
        throw new Error('Cannot downgrade to current tier');
      }

      // Process the tier change
      const upgrade = await this.lifecycleService.changeSubscriptionTier(collegeId, newTier, effectiveDate);

      // Update college subscription
      await this.updateCollegeSubscription(collegeId, {
        status: newTier,
        expiryDate: upgrade.effectiveDate,
        isActive: true
      });

      console.log(`Successfully changed subscription tier for college ${collegeId} to ${newTier}`);
    } catch (error) {
      console.error('Error changing subscription tier:', error);
      throw error;
    }
  }

  /**
   * Suspend college subscription
   */
  async suspendSubscription(collegeId: string, reason: string): Promise<void> {
    try {
      await this.updateCollegeSubscription(collegeId, {
        isActive: false
      });

      // Send suspension notification
      await this.sendSuspensionEmail(collegeId, reason);

      console.log(`Suspended subscription for college: ${collegeId}, reason: ${reason}`);
    } catch (error) {
      console.error('Error suspending subscription:', error);
      throw error;
    }
  }

  /**
   * Reactivate college subscription
   */
  async reactivateSubscription(collegeId: string): Promise<void> {
    try {
      await this.updateCollegeSubscription(collegeId, {
        isActive: true
      });

      // Send reactivation notification
      await this.sendReactivationEmail(collegeId);

      console.log(`Reactivated subscription for college: ${collegeId}`);
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription compliance report
   */
  async getComplianceReport(collegeId?: string): Promise<any> {
    try {
      if (collegeId) {
        return await this.complianceService.generateCollegeComplianceReport(collegeId);
      } else {
        return await this.complianceService.generateGlobalComplianceReport();
      }
    } catch (error) {
      console.error('Error getting compliance report:', error);
      throw error;
    }
  }

  /**
   * Export subscription data
   */
  async exportSubscriptionData(format: 'csv' | 'json' | 'pdf'): Promise<string> {
    try {
      return await this.complianceService.exportComplianceData(format);
    } catch (error) {
      console.error('Error exporting subscription data:', error);
      throw error;
    }
  }

  /**
   * Check feature access for a college
   */
  async checkFeatureAccess(collegeId: string, featureId: string): Promise<any> {
    try {
      return await this.featureAccessService.checkFeatureAccess(collegeId, featureId);
    } catch (error) {
      console.error('Error checking feature access:', error);
      throw error;
    }
  }

  /**
   * Get available features for a college
   */
  async getAvailableFeatures(collegeId: string): Promise<any[]> {
    try {
      return await this.featureAccessService.getAvailableFeatures(collegeId);
    } catch (error) {
      console.error('Error getting available features:', error);
      throw error;
    }
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(collegeId: string, featureId: string, usageData?: any): Promise<void> {
    try {
      await this.featureAccessService.trackFeatureUsage(collegeId, featureId, usageData);
    } catch (error) {
      console.error('Error tracking feature usage:', error);
      throw error;
    }
  }

  /**
   * Send welcome email for new subscription
   */
  private async sendWelcomeEmail(collegeId: string, tier: string): Promise<void> {
    try {
      const { EmailService } = await import('@/lib/email/email-service');
      const { prisma } = await import('@/lib/db');
      
      const emailService = new EmailService({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'noreply@exam-saas.com',
          pass: 'password'
        },
        from: 'noreply@exam-saas.com'
      }, prisma);
      
      const college = await prisma.college.findUnique({
        where: { id: collegeId },
        select: { name: true }
      });

      if (!college) return;

      const adminUsers = await prisma.user.findMany({
        where: {
          collegeId,
          role: { in: ['COLLEGE_ADMIN', 'SUPER_ADMIN'] }
        }
      });

      for (const user of adminUsers) {
        const features = this.getTierFeatures(tier);
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to ${tier} Subscription!</h2>
            <p>Dear Admin,</p>
            <p>Welcome to your new ${tier} subscription for <strong>${college.name}</strong>!</p>
            <h3>Your subscription includes:</h3>
            <ul>
              ${features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
            <p>Thank you for choosing our platform!</p>
          </div>
        `;
        
        await emailService.sendEmail({
          to: user.email,
          subject: `Welcome to ${tier} Subscription - ${college.name}`,
          html,
          text: `Welcome to ${tier} Subscription for ${college.name}. Features: ${features.join(', ')}`,
          template: 'welcome-subscription',
          metadata: {
            collegeName: college.name,
            tier,
            features
          },
          collegeId
        });
      }
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  /**
   * Send suspension email
   */
  private async sendSuspensionEmail(collegeId: string, reason: string): Promise<void> {
    try {
      const { EmailService } = await import('@/lib/email/email-service');
      const { prisma } = await import('@/lib/db');
      
      const emailService = new EmailService({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'noreply@exam-saas.com',
          pass: 'password'
        },
        from: 'noreply@exam-saas.com'
      }, prisma);
      
      const college = await prisma.college.findUnique({
        where: { id: collegeId },
        select: { name: true }
      });

      if (!college) return;

      const adminUsers = await prisma.user.findMany({
        where: {
          collegeId,
          role: { in: ['COLLEGE_ADMIN', 'SUPER_ADMIN'] }
        }
      });

      for (const user of adminUsers) {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Subscription Suspended</h2>
            <p>Dear Admin,</p>
            <p>Your subscription for <strong>${college.name}</strong> has been suspended.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>Please contact support to resolve this issue and reactivate your subscription.</p>
          </div>
        `;
        
        await emailService.sendEmail({
          to: user.email,
          subject: `Subscription Suspended - ${college.name}`,
          html,
          text: `Subscription Suspended for ${college.name}. Reason: ${reason}`,
          template: 'subscription-suspended',
          metadata: {
            collegeName: college.name,
            reason
          },
          collegeId
        });
      }
    } catch (error) {
      console.error('Error sending suspension email:', error);
    }
  }

  /**
   * Send reactivation email
   */
  private async sendReactivationEmail(collegeId: string): Promise<void> {
    try {
      const { EmailService } = await import('@/lib/email/email-service');
      const { prisma } = await import('@/lib/db');
      
      const emailService = new EmailService({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'noreply@exam-saas.com',
          pass: 'password'
        },
        from: 'noreply@exam-saas.com'
      }, prisma);
      
      const college = await prisma.college.findUnique({
        where: { id: collegeId },
        select: { name: true }
      });

      if (!college) return;

      const adminUsers = await prisma.user.findMany({
        where: {
          collegeId,
          role: { in: ['COLLEGE_ADMIN', 'SUPER_ADMIN'] }
        }
      });

      for (const user of adminUsers) {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Subscription Reactivated</h2>
            <p>Dear Admin,</p>
            <p>Great news! Your subscription for <strong>${college.name}</strong> has been reactivated.</p>
            <p>You now have full access to all your subscription features.</p>
            <p>Thank you for your patience!</p>
          </div>
        `;
        
        await emailService.sendEmail({
          to: user.email,
          subject: `Subscription Reactivated - ${college.name}`,
          html,
          text: `Subscription Reactivated for ${college.name}. You now have full access to all features.`,
          template: 'subscription-reactivated',
          metadata: {
            collegeName: college.name
          },
          collegeId
        });
      }
    } catch (error) {
      console.error('Error sending reactivation email:', error);
    }
  }

  /**
   * Get features for a specific tier
   */
  private getTierFeatures(tier: string): string[] {
    const tierFeatures: Record<string, string[]> = {
      'TRIAL': ['Basic Features', '5 Users', 'Email Support'],
      'BASIC': ['Basic Features', '50 Users', 'Basic Analytics', 'Email Support'],
      'STANDARD': ['Basic Features', '200 Users', 'Advanced Analytics', 'API Access', 'Email Support'],
      'PREMIUM': ['All Features', '1000 Users', 'Advanced Analytics', 'API Access', 'Priority Support'],
      'ENTERPRISE': ['All Features', 'Unlimited Users', 'Custom Features', 'Dedicated Support', 'SLA Guarantee']
    };

    return tierFeatures[tier] || tierFeatures['TRIAL'];
  }

  /**
   * Generate mock revenue trends
   */
  private generateMockRevenueTrends(): Array<{ month: string; revenue: number; subscriptions: number }> {
    const trends = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      trends.push({
        month,
        revenue: Math.floor(Math.random() * 5000) + 2000, // Random revenue between 2000-7000
        subscriptions: Math.floor(Math.random() * 20) + 10 // Random subscriptions between 10-30
      });
    }
    
    return trends;
  }
}
