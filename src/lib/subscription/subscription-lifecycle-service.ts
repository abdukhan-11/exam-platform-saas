import { prisma } from '@/lib/db';
import { EmailService } from '@/lib/email/email-service';
import { ActivityLogger } from '@/lib/user-management/activity-logger';
import { SubscriptionEnforcementService, SubscriptionTier } from './subscription-enforcement-service';

export interface BillingCycle {
  id: string;
  collegeId: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: Date;
  paidDate?: Date;
  invoiceNumber: string;
  paymentMethod?: string;
  notes?: string;
}

export interface SubscriptionUpgrade {
  collegeId: string;
  fromTier: string;
  toTier: string;
  effectiveDate: Date;
  proratedAmount: number;
  features: string[];
  migrationNotes: string;
}

export interface RenewalReminder {
  collegeId: string;
  reminderType: 'EXPIRY_WARNING' | 'GRACE_PERIOD' | 'FINAL_WARNING';
  sentDate: Date;
  nextReminderDate: Date;
  reminderCount: number;
}

export class SubscriptionLifecycleService {
  private emailService: EmailService;
  private activityLogger: ActivityLogger;
  private enforcementService: SubscriptionEnforcementService;

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
    this.enforcementService = new SubscriptionEnforcementService();
  }

  /**
   * Process billing cycles for all active subscriptions
   */
  async processBillingCycles(): Promise<void> {
    try {
      console.log('Processing billing cycles...');
      
      const colleges = await prisma.college.findMany({
        where: {
          isActive: true,
          subscriptionStatus: { not: 'TRIAL' }
        }
      });

      for (const college of colleges) {
        await this.processCollegeBillingCycle(college);
      }

      console.log('Billing cycle processing completed');
    } catch (error) {
      console.error('Error processing billing cycles:', error);
      throw error;
    }
    }

  /**
   * Process billing cycle for a specific college
   */
  private async processCollegeBillingCycle(college: any): Promise<void> {
    try {
      const tier = this.enforcementService.getSubscriptionTier(college.subscriptionStatus);
      if (!tier) return;

      const today = new Date();
      const lastBilling = college.subscriptionExpiry || college.createdAt;
      const nextBilling = this.calculateNextBillingDate(lastBilling, tier.billingCycle);

      // Check if it's time for a new billing cycle
      if (nextBilling <= today) {
        await this.createBillingCycle(college, tier, nextBilling);
        await this.sendBillingNotification(college, tier, nextBilling);
      }

      // Check for overdue payments
      await this.checkOverduePayments(college);

    } catch (error) {
      console.error(`Error processing billing cycle for college ${college.id}:`, error);
    }
  }

  /**
   * Create a new billing cycle
   */
  private async createBillingCycle(college: any, tier: SubscriptionTier, billingDate: Date): Promise<void> {
    const invoiceNumber = this.generateInvoiceNumber(college.id);
    const dueDate = new Date(billingDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from billing

    // Since billingCycle model doesn't exist, we'll store billing info in college metadata
    // In a real implementation, you'd create a separate billing table
    const billingInfo = {
      collegeId: college.id,
      startDate: billingDate,
      endDate: this.calculateEndDate(billingDate, tier.billingCycle),
      amount: tier.price,
      currency: 'USD',
      status: 'PENDING',
      dueDate,
      invoiceNumber,
      notes: `Billing cycle for ${tier.name} subscription`
    };

    // Update college subscription expiry
    await prisma.college.update({
      where: { id: college.id },
      data: {
        subscriptionExpiry: this.calculateEndDate(billingDate, tier.billingCycle)
      }
    });

    // Log the action
    await this.activityLogger.logActivity({
      userId: 'SYSTEM',
      action: 'BILLING_CYCLE_CREATED',
      resourceType: 'COLLEGE',
      resourceId: college.id,
      details: {
        tier: tier.name,
        amount: tier.price,
        invoiceNumber,
        dueDate,
        billingInfo
      }
    });
  }

  /**
   * Check for overdue payments and handle them
   */
  private async checkOverduePayments(college: any): Promise<void> {
    // Since billingCycle model doesn't exist, we'll check subscription expiry
    // In a real implementation, you'd query a billing table
    if (college.subscriptionExpiry && college.subscriptionExpiry < new Date()) {
      // Subscription is expired, treat as overdue
      const overdueInfo = {
        id: `overdue-${college.id}`,
        collegeId: college.id,
        status: 'OVERDUE',
        dueDate: college.subscriptionExpiry,
        amount: 0, // Would come from actual billing data
        invoiceNumber: `INV-${college.id}-${Date.now()}`
      };

      // Send overdue notification
      await this.sendOverdueNotification(college, overdueInfo);

      // Start grace period process
      await this.startGracePeriod(college, overdueInfo);

      // Log the action
      await this.activityLogger.logActivity({
        userId: 'SYSTEM',
        action: 'PAYMENT_OVERDUE',
        resourceType: 'COLLEGE',
        resourceId: college.id,
        details: {
          invoiceNumber: overdueInfo.invoiceNumber,
          dueDate: overdueInfo.dueDate,
          amount: overdueInfo.amount
        }
      });
    }
  }

  /**
   * Start grace period for overdue payment
   */
  private async startGracePeriod(college: any, billingCycle: any): Promise<void> {
    const tier = this.enforcementService.getSubscriptionTier(college.subscriptionStatus);
    if (!tier) return;

    // Set grace period expiry
    const gracePeriodEnd = new Date(Date.now() + (tier.gracePeriodDays * 24 * 60 * 60 * 1000));
    
    await prisma.college.update({
      where: { id: college.id },
      data: {
        subscriptionExpiry: gracePeriodEnd
      }
    });

    // Send grace period notification
    await this.sendGracePeriodNotification(college, billingCycle, gracePeriodEnd);
  }

  /**
   * Process payment for a billing cycle
   */
  async processPayment(billingCycleId: string, paymentData: {
    amount: number;
    paymentMethod: string;
    transactionId: string;
    notes?: string;
  }): Promise<void> {
    try {
      // Since billingCycle model doesn't exist, we'll work with college directly
      // In a real implementation, you'd query a billing table
      const college = await prisma.college.findUnique({
        where: { id: billingCycleId.replace('overdue-', '') } // Extract college ID from our generated ID
      });

      if (!college) {
        throw new Error('College not found');
      }

      // Create a mock billing cycle object for compatibility
      const billingCycle = {
        id: billingCycleId,
        collegeId: college.id,
        college: college,
        invoiceNumber: `INV-${college.id}-${Date.now()}`,
        amount: paymentData.amount,
        status: 'PAID',
        dueDate: college.subscriptionExpiry || new Date()
      };

      // Reactivate college if it was suspended
      if (!college.isActive) {
        await prisma.college.update({
          where: { id: college.id },
          data: {
            isActive: true,
            subscriptionStatus: college.subscriptionStatus
          }
        });
      }

      // Send payment confirmation
      await this.sendPaymentConfirmation(college, billingCycle, paymentData);

      // Log the action
      await this.activityLogger.logActivity({
        userId: 'SYSTEM',
        action: 'PAYMENT_RECEIVED',
        resourceType: 'COLLEGE',
        resourceId: college.id,
        details: {
          invoiceNumber: billingCycle.invoiceNumber,
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          transactionId: paymentData.transactionId
        }
      });

    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Handle subscription upgrade/downgrade
   */
  async changeSubscriptionTier(collegeId: string, newTier: string, effectiveDate: Date): Promise<SubscriptionUpgrade> {
    try {
      const college = await prisma.college.findUnique({
        where: { id: collegeId }
      });

      if (!college) {
        throw new Error('College not found');
      }

      const oldTier = this.enforcementService.getSubscriptionTier(college.subscriptionStatus);
      const newTierInfo = this.enforcementService.getSubscriptionTier(newTier);

      if (!oldTier || !newTierInfo) {
        throw new Error('Invalid subscription tier');
      }

      // Calculate prorated amount
      const proratedAmount = this.calculateProratedAmount(
        oldTier.price,
        newTierInfo.price,
        college.subscriptionExpiry,
        effectiveDate
      );

      // Create upgrade record
      const upgrade: SubscriptionUpgrade = {
        collegeId,
        fromTier: college.subscriptionStatus,
        toTier: newTier,
        effectiveDate,
        proratedAmount,
        features: newTierInfo.features,
        migrationNotes: `Upgraded from ${oldTier.name} to ${newTierInfo.name}`
      };

      // Update college subscription
      await prisma.college.update({
        where: { id: collegeId },
        data: {
          subscriptionStatus: newTier,
          subscriptionExpiry: this.calculateEndDate(effectiveDate, newTierInfo.billingCycle)
        }
      });

      // Send upgrade notification
      await this.sendUpgradeNotification(college, upgrade);

      // Log the action
      await this.activityLogger.logActivity({
        userId: 'SYSTEM',
        action: 'SUBSCRIPTION_TIER_CHANGED',
        resourceType: 'COLLEGE',
        resourceId: collegeId,
        details: {
          fromTier: oldTier.name,
          toTier: newTierInfo.name,
          proratedAmount,
          effectiveDate
        }
      });

      return upgrade;

    } catch (error) {
      console.error('Error changing subscription tier:', error);
      throw error;
    }
  }

  /**
   * Send renewal reminders
   */
  async sendRenewalReminders(): Promise<void> {
    try {
      const colleges = await prisma.college.findMany({
        where: {
          isActive: true,
          subscriptionExpiry: { not: null }
        }
      });

      for (const college of colleges) {
        await this.sendRenewalReminder(college);
      }
    } catch (error) {
      console.error('Error sending renewal reminders:', error);
    }
  }

  /**
   * Send renewal reminder for a specific college
   */
  private async sendRenewalReminder(college: any): Promise<void> {
    if (!college.subscriptionExpiry) return;

    const daysUntilExpiry = Math.ceil(
      (college.subscriptionExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    let reminderType: RenewalReminder['reminderType'] | null = null;
    let subject = '';
    let template = '';

    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      reminderType = 'EXPIRY_WARNING';
      subject = `Subscription Expiring Soon - ${college.name}`;
      template = 'renewal-warning';
    } else if (daysUntilExpiry <= 0 && daysUntilExpiry > -7) {
      reminderType = 'GRACE_PERIOD';
      subject = `Subscription Expired - Action Required - ${college.name}`;
      template = 'grace-period-warning';
    } else if (daysUntilExpiry <= -7) {
      reminderType = 'FINAL_WARNING';
      subject = `Final Warning - Account Suspension Imminent - ${college.name}`;
      template = 'final-warning';
    }

    if (reminderType) {
      await this.sendRenewalEmail(college, subject, template, daysUntilExpiry);
      
      // Log reminder sent
      await this.activityLogger.logActivity({
        userId: 'SYSTEM',
        action: 'RENEWAL_REMINDER_SENT',
        resourceType: 'COLLEGE',
        resourceId: college.id,
        details: {
          reminderType,
          daysUntilExpiry,
          expiryDate: college.subscriptionExpiry
        }
      });
    }
  }

  /**
   * Calculate next billing date based on billing cycle
   */
  private calculateNextBillingDate(lastBilling: Date, billingCycle: string): Date {
    const nextBilling = new Date(lastBilling);
    
    switch (billingCycle) {
      case 'monthly':
        nextBilling.setMonth(nextBilling.getMonth() + 1);
        break;
      case 'quarterly':
        nextBilling.setMonth(nextBilling.getMonth() + 3);
        break;
      case 'annually':
        nextBilling.setFullYear(nextBilling.getFullYear() + 1);
        break;
      default:
        nextBilling.setMonth(nextBilling.getMonth() + 1);
    }
    
    return nextBilling;
  }

  /**
   * Calculate end date for billing cycle
   */
  private calculateEndDate(startDate: Date, billingCycle: string): Date {
    const endDate = new Date(startDate);
    
    switch (billingCycle) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'annually':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }
    
    return endDate;
  }

  /**
   * Calculate prorated amount for subscription changes
   */
  private calculateProratedAmount(
    oldPrice: number,
    newPrice: number,
    expiryDate: Date | null,
    effectiveDate: Date
  ): number {
    if (!expiryDate || expiryDate <= effectiveDate) {
      return newPrice;
    }

    const remainingDays = Math.ceil(
      (expiryDate.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalDays = Math.ceil(
      (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    const proratedOldPrice = (oldPrice * remainingDays) / totalDays;
    const proratedNewPrice = (newPrice * remainingDays) / totalDays;

    return Math.max(0, proratedNewPrice - proratedOldPrice);
  }

  /**
   * Generate unique invoice number
   */
  private generateInvoiceNumber(collegeId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `INV-${collegeId.substring(0, 4)}-${timestamp}-${random}`.toUpperCase();
  }

  // Email notification methods
  private async sendBillingNotification(college: any, tier: SubscriptionTier, billingDate: Date): Promise<void> {
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
            <h2>Subscription Update</h2>
            <p>Dear Admin,</p>
            <p>Your subscription for <strong>${college.name}</strong> has been updated.</p>
            <p><strong>New Tier:</strong> ${tier.name}</p>
            <p><strong>Effective Date:</strong> ${new Date(billingDate).toLocaleDateString()}</p>
            <p>Thank you for your business!</p>
          </div>
        `;

        await this.emailService.sendEmail({
          to: user.email,
          subject: `New Billing Cycle - ${college.name}`,
          html,
          text: `New Billing Cycle for ${college.name}. Tier: ${tier.name}, Amount: ${tier.price}`,
          template: 'billing-notification',
          metadata: {
            collegeName: college.name,
            tier: tier.name,
            amount: tier.price,
            billingDate,
            dueDate: new Date(billingDate.getTime() + (30 * 24 * 60 * 60 * 1000))
          },
          collegeId: college.id
        });
      }
    } catch (error) {
      console.error('Error sending billing notification:', error);
    }
  }

  private async sendOverdueNotification(college: any, billingCycle: any): Promise<void> {
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
            <h2>Payment Overdue</h2>
            <p>Dear Admin,</p>
            <p>Your payment for <strong>${college.name}</strong> is overdue.</p>
            <p><strong>Invoice Number:</strong> ${billingCycle.invoiceNumber}</p>
            <p><strong>Amount Due:</strong> ${billingCycle.amount}</p>
            <p><strong>Due Date:</strong> ${billingCycle.dueDate.toLocaleDateString()}</p>
            <p>Please make payment as soon as possible to avoid service interruption.</p>
          </div>
        `;

        await this.emailService.sendEmail({
          to: user.email,
          subject: `Payment Overdue - ${college.name}`,
          html,
          text: `Payment Overdue for ${college.name}. Invoice: ${billingCycle.invoiceNumber}, Amount: ${billingCycle.amount}`,
          template: 'payment-overdue',
          metadata: {
            collegeName: college.name,
            invoiceNumber: billingCycle.invoiceNumber,
            amount: billingCycle.amount,
            dueDate: billingCycle.dueDate
          },
          collegeId: college.id
        });
      }
    } catch (error) {
      console.error('Error sending overdue notification:', error);
    }
  }

  private async sendGracePeriodNotification(college: any, billingCycle: any, gracePeriodEnd: Date): Promise<void> {
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
            <h2>Grace Period Started</h2>
            <p>Dear Admin,</p>
            <p>Your payment for <strong>${college.name}</strong> has entered a grace period.</p>
            <p><strong>Invoice Number:</strong> ${billingCycle.invoiceNumber}</p>
            <p><strong>Amount Due:</strong> ${billingCycle.amount}</p>
            <p><strong>Grace Period Ends:</strong> ${gracePeriodEnd.toLocaleDateString()}</p>
            <p>Please make payment before the grace period ends to avoid service interruption.</p>
          </div>
        `;

        await this.emailService.sendEmail({
          to: user.email,
          subject: `Grace Period Started - ${college.name}`,
          html,
          text: `Grace Period Started for ${college.name}. Invoice: ${billingCycle.invoiceNumber}, Amount: ${billingCycle.amount}`,
          template: 'grace-period-notification',
          metadata: {
            collegeName: college.name,
            invoiceNumber: billingCycle.invoiceNumber,
            amount: billingCycle.amount,
            gracePeriodEnd
          },
          collegeId: college.id
        });
      }
    } catch (error) {
      console.error('Error sending grace period notification:', error);
    }
  }

  private async sendPaymentConfirmation(college: any, billingCycle: any, paymentData: any): Promise<void> {
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
            <h2>Payment Confirmed</h2>
            <p>Dear Admin,</p>
            <p>Your payment for <strong>${college.name}</strong> has been confirmed.</p>
            <p><strong>Invoice Number:</strong> ${billingCycle.invoiceNumber}</p>
            <p><strong>Amount Paid:</strong> ${billingCycle.amount}</p>
            <p><strong>Payment Method:</strong> ${paymentData.paymentMethod || 'N/A'}</p>
            <p><strong>Transaction ID:</strong> ${paymentData.transactionId || 'N/A'}</p>
            <p>Thank you for your payment!</p>
          </div>
        `;

        await this.emailService.sendEmail({
          to: user.email,
          subject: `Payment Confirmed - ${college.name}`,
          html,
          text: `Payment Confirmed for ${college.name}. Invoice: ${billingCycle.invoiceNumber}, Amount: ${billingCycle.amount}`,
          template: 'payment-confirmation',
          metadata: {
            collegeName: college.name,
            invoiceNumber: billingCycle.invoiceNumber,
            amount: billingCycle.amount,
            paymentMethod: paymentData.paymentMethod,
            transactionId: paymentData.transactionId
          },
          collegeId: college.id
        });
      }
    } catch (error) {
      console.error('Error sending payment confirmation:', error);
    }
  }

  private async sendUpgradeNotification(college: any, upgrade: SubscriptionUpgrade): Promise<void> {
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
            <h2>Subscription Upgraded</h2>
            <p>Dear Admin,</p>
            <p>Your subscription for <strong>${college.name}</strong> has been upgraded.</p>
            <p><strong>From Tier:</strong> ${upgrade.fromTier}</p>
            <p><strong>To Tier:</strong> ${upgrade.toTier}</p>
            <p><strong>Effective Date:</strong> ${upgrade.effectiveDate.toLocaleDateString()}</p>
            <p><strong>Prorated Amount:</strong> ${upgrade.proratedAmount}</p>
            <p><strong>New Features:</strong> ${upgrade.features.join(', ')}</p>
            <p>Thank you for upgrading!</p>
          </div>
        `;

        await this.emailService.sendEmail({
          to: user.email,
          subject: `Subscription Upgraded - ${college.name}`,
          html,
          text: `Subscription Upgraded for ${college.name}. From ${upgrade.fromTier} to ${upgrade.toTier}`,
          template: 'subscription-upgrade',
          metadata: {
            collegeName: college.name,
            fromTier: upgrade.fromTier,
            toTier: upgrade.toTier,
            effectiveDate: upgrade.effectiveDate,
            proratedAmount: upgrade.proratedAmount,
            features: upgrade.features
          },
          collegeId: college.id
        });
      }
    } catch (error) {
      console.error('Error sending upgrade notification:', error);
    }
  }

  private async sendRenewalEmail(college: any, subject: string, template: string, daysUntilExpiry: number): Promise<void> {
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
            <h2>Subscription Renewal</h2>
            <p>Dear Admin,</p>
            <p>Your subscription for <strong>${college.name}</strong> needs attention.</p>
            <p><strong>Days Until Expiry:</strong> ${Math.abs(daysUntilExpiry)}</p>
            <p><strong>Expiry Date:</strong> ${college.subscriptionExpiry?.toLocaleDateString() || 'Unknown'}</p>
            <p>Please renew your subscription to continue using our services.</p>
          </div>
        `;

        await this.emailService.sendEmail({
          to: user.email,
          subject: `Subscription Renewal - ${college.name}`,
          html,
          text: `Subscription Renewal for ${college.name}. Days until expiry: ${Math.abs(daysUntilExpiry)}`,
          template: 'subscription-renewal',
          metadata: {
            collegeName: college.name,
            daysUntilExpiry: Math.abs(daysUntilExpiry),
            expiryDate: college.subscriptionExpiry,
            isExpired: daysUntilExpiry <= 0
          },
          collegeId: college.id
        });
      }
    } catch (error) {
      console.error('Error sending renewal email:', error);
    }
  }

  private async sendSubscriptionExpiryNotification(college: any, daysUntilExpiry: number, expiryDate: Date, isExpired: boolean): Promise<void> {
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
            <h2>Subscription ${isExpired ? 'Expired' : 'Expiring Soon'}</h2>
            <p>Dear Admin,</p>
            <p>Your subscription for <strong>${college.name}</strong> ${isExpired ? 'has expired' : `will expire in ${daysUntilExpiry} days`}.</p>
            <p><strong>Expiry Date:</strong> ${expiryDate.toLocaleDateString()}</p>
            ${isExpired ? '<p>Please renew your subscription to continue using our services.</p>' : '<p>Please renew your subscription before it expires.</p>'}
          </div>
        `;

        await this.emailService.sendEmail({
          to: user.email,
          subject: `Subscription ${isExpired ? 'Expired' : 'Expiring Soon'} - ${college.name}`,
          html,
          text: `Subscription ${isExpired ? 'Expired' : 'Expiring Soon'} for ${college.name}. Expiry Date: ${expiryDate.toLocaleDateString()}`,
          template: 'subscription-expiry',
          metadata: {
            collegeName: college.name,
            daysUntilExpiry,
            expiryDate,
            isExpired
          },
          collegeId: college.id
        });
      }
    } catch (error) {
      console.error('Error sending subscription expiry notification:', error);
    }
  }
}
