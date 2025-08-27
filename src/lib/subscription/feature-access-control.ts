import { prisma } from '@/lib/db';
import { SubscriptionEnforcementService, SubscriptionTier } from './subscription-enforcement-service';

export interface FeatureAccess {
  featureId: string;
  featureName: string;
  description: string;
  subscriptionTiers: string[];
  isActive: boolean;
  usageLimit?: number;
  currentUsage?: number;
}

export interface AccessControlMatrix {
  [featureId: string]: {
    [tierName: string]: {
      allowed: boolean;
      usageLimit?: number;
      restrictions?: string[];
    };
  };
}

export interface FeatureUsage {
  collegeId: string;
  featureId: string;
  usageCount: number;
  lastUsed: Date;
  usageLimit: number;
  isOverLimit: boolean;
}

export class FeatureAccessControlService {
  private enforcementService: SubscriptionEnforcementService;

  // Feature definitions with access control matrix
  private readonly features: Record<string, FeatureAccess> = {
    'basic-exam-creation': {
      featureId: 'basic-exam-creation',
      featureName: 'Basic Exam Creation',
      description: 'Create and manage basic exams with multiple choice questions',
      subscriptionTiers: ['TRIAL', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'],
      isActive: true,
      usageLimit: 10
    },
    'advanced-exam-creation': {
      featureId: 'advanced-exam-creation',
      featureName: 'Advanced Exam Creation',
      description: 'Create exams with advanced question types, multimedia, and complex scoring',
      subscriptionTiers: ['STANDARD', 'PREMIUM', 'ENTERPRISE'],
      isActive: true,
      usageLimit: 50
    },
    'unlimited-exam-creation': {
      featureId: 'unlimited-exam-creation',
      featureName: 'Unlimited Exam Creation',
      description: 'Create unlimited exams with all features',
      subscriptionTiers: ['PREMIUM', 'ENTERPRISE'],
      isActive: true
    },
    'basic-analytics': {
      featureId: 'basic-analytics',
      featureName: 'Basic Analytics',
      description: 'View basic exam results and student performance metrics',
      subscriptionTiers: ['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'],
      isActive: true
    },
    'advanced-analytics': {
      featureId: 'advanced-analytics',
      featureName: 'Advanced Analytics',
      description: 'Advanced reporting, trend analysis, and predictive insights',
      subscriptionTiers: ['STANDARD', 'PREMIUM', 'ENTERPRISE'],
      isActive: true
    },
    'api-access': {
      featureId: 'api-access',
      featureName: 'API Access',
      description: 'Programmatic access to platform features via REST API',
      subscriptionTiers: ['PREMIUM', 'ENTERPRISE'],
      isActive: true,
      usageLimit: 1000
    },
    'unlimited-api-access': {
      featureId: 'unlimited-api-access',
      featureName: 'Unlimited API Access',
      description: 'Unlimited API calls with priority rate limits',
      subscriptionTiers: ['ENTERPRISE'],
      isActive: true
    },
    'priority-support': {
      featureId: 'priority-support',
      featureName: 'Priority Support',
      description: 'Priority customer support with dedicated response times',
      subscriptionTiers: ['PREMIUM', 'ENTERPRISE'],
      isActive: true
    },
    'dedicated-support': {
      featureId: 'dedicated-support',
      featureName: 'Dedicated Support',
      description: 'Dedicated account manager and 24/7 support',
      subscriptionTiers: ['ENTERPRISE'],
      isActive: true
    },
    'custom-integrations': {
      featureId: 'custom-integrations',
      featureName: 'Custom Integrations',
      description: 'Custom integrations with third-party systems',
      subscriptionTiers: ['ENTERPRISE'],
      isActive: true
    },
    'bulk-user-management': {
      featureId: 'bulk-user-management',
      featureName: 'Bulk User Management',
      description: 'Import/export users in bulk, bulk operations',
      subscriptionTiers: ['STANDARD', 'PREMIUM', 'ENTERPRISE'],
      isActive: true
    },
    'advanced-security': {
      featureId: 'advanced-security',
      featureName: 'Advanced Security Features',
      description: 'Advanced proctoring, IP restrictions, device fingerprinting',
      subscriptionTiers: ['PREMIUM', 'ENTERPRISE'],
      isActive: true
    },
    'white-label': {
      featureId: 'white-label',
      featureName: 'White Label Solution',
      description: 'Custom branding and white-label options',
      subscriptionTiers: ['ENTERPRISE'],
      isActive: true
    }
  };

  // Access control matrix
  private readonly accessControlMatrix: AccessControlMatrix = {
    'basic-exam-creation': {
      'TRIAL': { allowed: true, usageLimit: 5 },
      'BASIC': { allowed: true, usageLimit: 10 },
      'STANDARD': { allowed: true, usageLimit: 25 },
      'PREMIUM': { allowed: true, usageLimit: 100 },
      'ENTERPRISE': { allowed: true }
    },
    'advanced-exam-creation': {
      'TRIAL': { allowed: false },
      'BASIC': { allowed: false },
      'STANDARD': { allowed: true, usageLimit: 50 },
      'PREMIUM': { allowed: true, usageLimit: 200 },
      'ENTERPRISE': { allowed: true }
    },
    'unlimited-exam-creation': {
      'TRIAL': { allowed: false },
      'BASIC': { allowed: false },
      'STANDARD': { allowed: false },
      'PREMIUM': { allowed: true },
      'ENTERPRISE': { allowed: true }
    },
    'basic-analytics': {
      'TRIAL': { allowed: false },
      'BASIC': { allowed: true },
      'STANDARD': { allowed: true },
      'PREMIUM': { allowed: true },
      'ENTERPRISE': { allowed: true }
    },
    'advanced-analytics': {
      'TRIAL': { allowed: false },
      'BASIC': { allowed: false },
      'STANDARD': { allowed: true },
      'PREMIUM': { allowed: true },
      'ENTERPRISE': { allowed: true }
    },
    'api-access': {
      'TRIAL': { allowed: false },
      'BASIC': { allowed: false },
      'STANDARD': { allowed: false },
      'PREMIUM': { allowed: true, usageLimit: 1000 },
      'ENTERPRISE': { allowed: true, usageLimit: 5000 }
    },
    'unlimited-api-access': {
      'TRIAL': { allowed: false },
      'BASIC': { allowed: false },
      'STANDARD': { allowed: false },
      'PREMIUM': { allowed: false },
      'ENTERPRISE': { allowed: true }
    },
    'priority-support': {
      'TRIAL': { allowed: false },
      'BASIC': { allowed: false },
      'STANDARD': { allowed: false },
      'PREMIUM': { allowed: true },
      'ENTERPRISE': { allowed: true }
    },
    'dedicated-support': {
      'TRIAL': { allowed: false },
      'BASIC': { allowed: false },
      'STANDARD': { allowed: false },
      'PREMIUM': { allowed: false },
      'ENTERPRISE': { allowed: true }
    },
    'custom-integrations': {
      'TRIAL': { allowed: false },
      'BASIC': { allowed: false },
      'STANDARD': { allowed: false },
      'PREMIUM': { allowed: false },
      'ENTERPRISE': { allowed: true }
    },
    'bulk-user-management': {
      'TRIAL': { allowed: false },
      'BASIC': { allowed: false },
      'STANDARD': { allowed: true },
      'PREMIUM': { allowed: true },
      'ENTERPRISE': { allowed: true }
    },
    'advanced-security': {
      'TRIAL': { allowed: false },
      'BASIC': { allowed: false },
      'STANDARD': { allowed: false },
      'PREMIUM': { allowed: true },
      'ENTERPRISE': { allowed: true }
    },
    'white-label': {
      'TRIAL': { allowed: false },
      'BASIC': { allowed: false },
      'STANDARD': { allowed: false },
      'PREMIUM': { allowed: false },
      'ENTERPRISE': { allowed: true }
    }
  };

  constructor() {
    this.enforcementService = new SubscriptionEnforcementService();
  }

  /**
   * Check if a college has access to a specific feature
   */
  async checkFeatureAccess(collegeId: string, featureId: string): Promise<{
    hasAccess: boolean;
    usageLimit?: number;
    currentUsage?: number;
    restrictions?: string[];
    message?: string;
  }> {
    try {
      // Get college subscription information
      const college = await prisma.college.findUnique({
        where: { id: collegeId },
        select: {
          id: true,
          name: true,
          subscriptionStatus: true,
          isActive: true,
          subscriptionExpiry: true
        }
      });

      if (!college) {
        return {
          hasAccess: false,
          message: 'College not found'
        };
      }

      // Check if college is active
      if (!college.isActive) {
        return {
          hasAccess: false,
          message: 'College account is suspended'
        };
      }

      // Check if subscription is expired
      if (college.subscriptionExpiry && college.subscriptionExpiry < new Date()) {
        return {
          hasAccess: false,
          message: 'Subscription has expired'
        };
      }

      // Get feature information
      const feature = this.features[featureId];
      if (!feature) {
        return {
          hasAccess: false,
          message: 'Feature not found'
        };
      }

      // Check if feature is active
      if (!feature.isActive) {
        return {
          hasAccess: false,
          message: 'Feature is currently disabled'
        };
      }

      // Check subscription tier access
      const tierAccess = this.accessControlMatrix[featureId]?.[college.subscriptionStatus];
      if (!tierAccess || !tierAccess.allowed) {
        return {
          hasAccess: false,
          message: `Feature not available in ${college.subscriptionStatus} tier`
        };
      }

      // Check usage limits if applicable
      if (tierAccess.usageLimit) {
        const currentUsage = await this.getFeatureUsage(collegeId, featureId);
        
        if (currentUsage >= tierAccess.usageLimit) {
          return {
            hasAccess: false,
            usageLimit: tierAccess.usageLimit,
            currentUsage,
            message: `Usage limit exceeded: ${currentUsage}/${tierAccess.usageLimit}`
          };
        }

        return {
          hasAccess: true,
          usageLimit: tierAccess.usageLimit,
          currentUsage,
          restrictions: tierAccess.restrictions
        };
      }

      return {
        hasAccess: true,
        restrictions: tierAccess.restrictions
      };

    } catch (error) {
      console.error('Error checking feature access:', error);
      return {
        hasAccess: false,
        message: 'Error checking feature access'
      };
    }
  }

  /**
   * Get all features available to a college
   */
  async getAvailableFeatures(collegeId: string): Promise<FeatureAccess[]> {
    try {
      const college = await prisma.college.findUnique({
        where: { id: collegeId },
        select: {
          subscriptionStatus: true,
          isActive: true,
          subscriptionExpiry: true
        }
      });

      if (!college || !college.isActive) {
        return [];
      }

      if (college.subscriptionExpiry && college.subscriptionExpiry < new Date()) {
        return [];
      }

      const availableFeatures: FeatureAccess[] = [];

      for (const [featureId, feature] of Object.entries(this.features)) {
        const tierAccess = this.accessControlMatrix[featureId]?.[college.subscriptionStatus];
        
        if (tierAccess?.allowed) {
          // Check usage limits
          if (tierAccess.usageLimit) {
            const currentUsage = await this.getFeatureUsage(collegeId, featureId);
            feature.currentUsage = currentUsage;
            feature.usageLimit = tierAccess.usageLimit;
          }

          availableFeatures.push({ ...feature });
        }
      }

      return availableFeatures;
    } catch (error) {
      console.error('Error getting available features:', error);
      return [];
    }
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(collegeId: string, featureId: string, usageData?: any): Promise<void> {
    try {
      // Check if feature access is allowed
      const accessCheck = await this.checkFeatureAccess(collegeId, featureId);
      
      if (!accessCheck.hasAccess) {
        throw new Error(`Access denied to feature: ${featureId}`);
      }

      // Record feature usage (you'd need to create a table for this)
      // For now, we'll log it as an activity
      await this.logFeatureUsage(collegeId, featureId, usageData);

      // Check if usage limit is approaching
      if (accessCheck.usageLimit && accessCheck.currentUsage) {
        const usagePercent = (accessCheck.currentUsage / accessCheck.usageLimit) * 100;
        
        if (usagePercent >= 90) {
          await this.sendUsageLimitWarning(collegeId, featureId, accessCheck.currentUsage, accessCheck.usageLimit);
        }
      }

    } catch (error) {
      console.error('Error tracking feature usage:', error);
      throw error;
    }
  }

  /**
   * Get feature usage for a college
   */
  async getFeatureUsage(collegeId: string, featureId: string): Promise<number> {
    try {
      // This would query the feature usage table
      // For now, return a mock value based on the feature type
      const feature = this.features[featureId];
      if (!feature) return 0;

      // Mock usage based on feature type
      switch (featureId) {
        case 'basic-exam-creation':
        case 'advanced-exam-creation':
          // Count exams created by the college
          const examCount = await prisma.exam.count({
            where: { collegeId }
          });
          return examCount;
        
        case 'api-access':
          // This would be tracked in a separate API usage table
          return Math.floor(Math.random() * 500); // Mock value
        
        default:
          return 0;
      }
    } catch (error) {
      console.error('Error getting feature usage:', error);
      return 0;
    }
  }

  /**
   * Get comprehensive feature usage report for a college
   */
  async getFeatureUsageReport(collegeId: string): Promise<FeatureUsage[]> {
    try {
      const availableFeatures = await this.getAvailableFeatures(collegeId);
      const usageReport: FeatureUsage[] = [];

      for (const feature of availableFeatures) {
        const currentUsage = await this.getFeatureUsage(collegeId, feature.featureId);
        const usageLimit = feature.usageLimit || 0;

        usageReport.push({
          collegeId,
          featureId: feature.featureId,
          usageCount: currentUsage,
          lastUsed: new Date(), // This would come from actual usage tracking
          usageLimit,
          isOverLimit: usageLimit > 0 && currentUsage >= usageLimit
        });
      }

      return usageReport;
    } catch (error) {
      console.error('Error getting feature usage report:', error);
      return [];
    }
  }

  /**
   * Check if a college can upgrade to access a feature
   */
  async checkUpgradeRequired(collegeId: string, featureId: string): Promise<{
    upgradeRequired: boolean;
    currentTier: string;
    requiredTier: string;
    upgradeCost: number;
    features: string[];
  }> {
    try {
      const college = await prisma.college.findUnique({
        where: { id: collegeId },
        select: { subscriptionStatus: true }
      });

      if (!college) {
        throw new Error('College not found');
      }

      const currentTier = college.subscriptionStatus;
      const feature = this.features[featureId];

      if (!feature) {
        throw new Error('Feature not found');
      }

      // Find the minimum tier required for this feature
      let requiredTier = currentTier;
      let upgradeRequired = false;

      for (const tier of ['TRIAL', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE']) {
        const tierAccess = this.accessControlMatrix[featureId]?.[tier];
        if (tierAccess?.allowed) {
          requiredTier = tier;
          break;
        }
      }

      if (requiredTier !== currentTier) {
        upgradeRequired = true;
      }

      // Calculate upgrade cost
      const currentTierInfo = this.enforcementService.getSubscriptionTier(currentTier);
      const requiredTierInfo = this.enforcementService.getSubscriptionTier(requiredTier);
      
      let upgradeCost = 0;
      if (currentTierInfo && requiredTierInfo) {
        upgradeCost = Math.max(0, requiredTierInfo.price - currentTierInfo.price);
      }

      return {
        upgradeRequired,
        currentTier,
        requiredTier,
        upgradeCost,
        features: requiredTierInfo?.features || []
      };

    } catch (error) {
      console.error('Error checking upgrade requirement:', error);
      throw error;
    }
  }

  /**
   * Get feature access matrix for all tiers
   */
  getFeatureAccessMatrix(): AccessControlMatrix {
    return { ...this.accessControlMatrix };
  }

  /**
   * Get all available features
   */
  getAllFeatures(): FeatureAccess[] {
    return Object.values(this.features).map(feature => ({ ...feature }));
  }

  /**
   * Log feature usage for tracking
   */
  private async logFeatureUsage(collegeId: string, featureId: string, usageData?: any): Promise<void> {
    // This would store feature usage in a dedicated table
    // For now, we'll use the activity logger
    const { ActivityLogger } = await import('@/lib/user-management/activity-logger');
    const { prisma } = await import('@/lib/db');
    const activityLogger = new ActivityLogger(prisma);
    
    await activityLogger.logActivity({
      userId: 'SYSTEM',
      action: 'FEATURE_USAGE_TRACKED',
      resourceType: 'FEATURE',
      resourceId: featureId,
      details: {
        featureId,
        usageData,
        timestamp: new Date()
      }
    });
  }

  /**
   * Send usage limit warning
   */
  private async sendUsageLimitWarning(
    collegeId: string, 
    featureId: string, 
    currentUsage: number, 
    usageLimit: number
  ): Promise<void> {
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
            <h2>Usage Limit Warning</h2>
            <p>Dear Admin,</p>
            <p>Your usage for <strong>${this.features[featureId]?.featureName || featureId}</strong> is approaching the limit.</p>
            <p><strong>Current Usage:</strong> ${currentUsage}</p>
            <p><strong>Usage Limit:</strong> ${usageLimit}</p>
            <p><strong>Usage Percentage:</strong> ${Math.round((currentUsage / usageLimit) * 100)}%</p>
            <p>Please consider upgrading your subscription to avoid service interruption.</p>
          </div>
        `;

        await emailService.sendEmail({
          to: user.email,
          subject: `Usage Limit Warning - ${college.name}`,
          html,
          text: `Usage Limit Warning for ${college.name}. Feature: ${this.features[featureId]?.featureName || featureId}. Current: ${currentUsage}/${usageLimit}`,
          template: 'usage-limit-warning',
          metadata: {
            collegeName: college.name,
            featureName: this.features[featureId]?.featureName || featureId,
            currentUsage,
            usageLimit,
            usagePercent: Math.round((currentUsage / usageLimit) * 100)
          },
          collegeId
        });
      }
    } catch (error) {
      console.error('Error sending usage limit warning:', error);
    }
  }
}
