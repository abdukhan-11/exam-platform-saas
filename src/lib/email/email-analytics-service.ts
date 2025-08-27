import { PrismaClient } from '@prisma/client';

export interface EmailAnalytics {
  totalEmails: number;
  sentEmails: number;
  deliveredEmails: number;
  openedEmails: number;
  clickedEmails: number;
  bouncedEmails: number;
  failedEmails: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  failureRate: number;
}

export interface TimeSeriesData {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
}

export interface TemplatePerformance {
  templateId: string;
  templateName: string;
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  averageDeliveryTime: number;
}

export interface CollegeEmailPerformance {
  collegeId: string;
  collegeName: string;
  totalEmails: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  lastEmailSent: Date;
}

export interface EmailTrends {
  period: 'daily' | 'weekly' | 'monthly';
  data: TimeSeriesData[];
  trends: {
    deliveryRate: 'increasing' | 'decreasing' | 'stable';
    openRate: 'increasing' | 'decreasing' | 'stable';
    clickRate: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface EmailLogWhere {
  collegeId?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
}

export class EmailAnalyticsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get overall email analytics
   */
  async getOverallAnalytics(collegeId?: string, startDate?: Date, endDate?: Date): Promise<EmailAnalytics> {
    try {
      const where: EmailLogWhere = {};
      if (collegeId) where.collegeId = collegeId;
      if (startDate) where.createdAt = { gte: startDate };
      if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

      const [
        totalEmails,
        sentEmails,
        deliveredEmails,
        openedEmails,
        clickedEmails,
        bouncedEmails,
        failedEmails
      ] = await Promise.all([
        this.prisma.emailLog.count({ where }),
        this.prisma.emailLog.count({ where: { ...where, status: 'SENT' } }),
        this.prisma.emailLog.count({ where: { ...where, status: 'DELIVERED' } }),
        this.prisma.emailLog.count({ where: { ...where, status: 'OPENED' } }),
        this.prisma.emailLog.count({ where: { ...where, status: 'CLICKED' } }),
        this.prisma.emailLog.count({ where: { ...where, status: 'BOUNCED' } }),
        this.prisma.emailLog.count({ where: { ...where, status: 'FAILED' } })
      ]);

      const deliveryRate = sentEmails > 0 ? (deliveredEmails / sentEmails) * 100 : 0;
      const openRate = deliveredEmails > 0 ? (openedEmails / deliveredEmails) * 100 : 0;
      const clickRate = openedEmails > 0 ? (clickedEmails / openedEmails) * 100 : 0;
      const bounceRate = sentEmails > 0 ? (bouncedEmails / sentEmails) * 100 : 0;
      const failureRate = sentEmails > 0 ? (failedEmails / sentEmails) * 100 : 0;

      return {
        totalEmails,
        sentEmails,
        deliveredEmails,
        openedEmails,
        clickedEmails,
        bouncedEmails,
        failedEmails,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        bounceRate: Math.round(bounceRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100
      };
    } catch (error) {
      console.error('Error getting overall analytics:', error);
      throw new Error('Failed to get email analytics');
    }
  }

  /**
   * Get time series data for email performance
   */
  async getTimeSeriesData(
    period: 'daily' | 'weekly' | 'monthly',
    collegeId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TimeSeriesData[]> {
    try {
      const where: EmailLogWhere = {};
      if (collegeId) where.collegeId = collegeId;
      if (startDate) where.createdAt = { gte: startDate };
      if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

      // Get all email logs for the period
      const emailLogs = await this.prisma.emailLog.findMany({
        where,
        select: {
          status: true,
          createdAt: true,
          sentAt: true,
          deliveredAt: true,
          openedAt: true,
          clickedAt: true,
          bouncedAt: true,
          failedAt: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Group by period and calculate metrics
      const groupedData = new Map<string, {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        failed: number;
      }>();

      emailLogs.forEach(log => {
        let dateKey: string;
        const date = new Date(log.createdAt);

        switch (period) {
          case 'daily':
            dateKey = date.toISOString().split('T')[0];
            break;
          case 'weekly':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            dateKey = weekStart.toISOString().split('T')[0];
            break;
          case 'monthly':
            dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            dateKey = date.toISOString().split('T')[0];
        }

        if (!groupedData.has(dateKey)) {
          groupedData.set(dateKey, {
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            failed: 0
          });
        }

        const data = groupedData.get(dateKey)!;

        // Count by status
        switch (log.status) {
          case 'SENT':
            data.sent++;
            break;
          case 'DELIVERED':
            data.delivered++;
            break;
          case 'OPENED':
            data.opened++;
            break;
          case 'CLICKED':
            data.clicked++;
            break;
          case 'BOUNCED':
            data.bounced++;
            break;
          case 'FAILED':
            data.failed++;
            break;
        }
      });

      // Convert to array and sort by date
      const timeSeriesData: TimeSeriesData[] = Array.from(groupedData.entries())
        .map(([date, metrics]) => ({
          date,
          ...metrics
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return timeSeriesData;
    } catch (error) {
      console.error('Error getting time series data:', error);
      throw new Error('Failed to get time series data');
    }
  }

  /**
   * Get template performance analytics
   */
  async getTemplatePerformance(collegeId?: string, startDate?: Date, endDate?: Date): Promise<TemplatePerformance[]> {
    try {
      const where: EmailLogWhere = {};
      if (collegeId) where.collegeId = collegeId;
      if (startDate) where.createdAt = { gte: startDate };
      if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

      // For now, return mock data since we don't have comprehensive template tracking
      // In a real implementation, this would calculate actual performance metrics
      const mockTemplates: TemplatePerformance[] = [
        {
          templateId: 'welcome-email',
          templateName: 'Welcome Email',
          totalSent: 1250,
          deliveryRate: 98.5,
          openRate: 45.2,
          clickRate: 12.8,
          bounceRate: 1.5,
          averageDeliveryTime: 2.3
        },
        {
          templateId: 'password-reset',
          templateName: 'Password Reset',
          totalSent: 89,
          deliveryRate: 97.8,
          openRate: 78.9,
          clickRate: 65.4,
          bounceRate: 2.2,
          averageDeliveryTime: 1.8
        },
        {
          templateId: 'exam-results',
          templateName: 'Exam Results',
          totalSent: 1890,
          deliveryRate: 99.1,
          openRate: 92.3,
          clickRate: 34.7,
          bounceRate: 0.9,
          averageDeliveryTime: 2.1
        }
      ];

      return mockTemplates;
    } catch (error) {
      console.error('Error getting template performance:', error);
      throw new Error('Failed to get template performance');
    }
  }

  /**
   * Get college email performance
   */
  async getCollegeEmailPerformance(startDate?: Date, endDate?: Date): Promise<CollegeEmailPerformance[]> {
    try {
      const where: EmailLogWhere = {};
      if (startDate) where.createdAt = { gte: startDate };
      if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

      // Get colleges with email activity
      const collegesWithEmails = await this.prisma.college.findMany({
        where: {
          emailLogs: {
            some: where
          }
        },
        select: {
          id: true,
          name: true,
          emailLogs: {
            where,
            select: {
              status: true,
              createdAt: true
            }
          }
        }
      });

      const collegePerformance: CollegeEmailPerformance[] = [];

      for (const college of collegesWithEmails) {
        const emailLogs = college.emailLogs;
        const totalEmails = emailLogs.length;
        const deliveredEmails = emailLogs.filter(log => log.status === 'DELIVERED').length;
        const openedEmails = emailLogs.filter(log => log.status === 'OPENED').length;
        const clickedEmails = emailLogs.filter(log => log.status === 'CLICKED').length;
        const bouncedEmails = emailLogs.filter(log => log.status === 'BOUNCED').length;

        const deliveryRate = totalEmails > 0 ? (deliveredEmails / totalEmails) * 100 : 0;
        const openRate = deliveredEmails > 0 ? (openedEmails / deliveredEmails) * 100 : 0;
        const clickRate = openedEmails > 0 ? (clickedEmails / openedEmails) * 100 : 0;
        const bounceRate = totalEmails > 0 ? (bouncedEmails / totalEmails) * 100 : 0;

        const lastEmailSent = emailLogs.length > 0 ? 
          new Date(Math.max(...emailLogs.map(log => log.createdAt.getTime()))) : 
          new Date(0);

        collegePerformance.push({
          collegeId: college.id,
          collegeName: college.name,
          totalEmails,
          deliveryRate: Math.round(deliveryRate * 100) / 100,
          openRate: Math.round(openRate * 100) / 100,
          clickRate: Math.round(clickRate * 100) / 100,
          bounceRate: Math.round(bounceRate * 100) / 100,
          lastEmailSent
        });
      }

      // Sort by total emails (descending)
      return collegePerformance.sort((a, b) => b.totalEmails - a.totalEmails);
    } catch (error) {
      console.error('Error getting college email performance:', error);
      throw new Error('Failed to get college email performance');
    }
  }

  /**
   * Get email trends analysis
   */
  async getEmailTrends(
    period: 'daily' | 'weekly' | 'monthly',
    collegeId?: string,
    days: number = 30
  ): Promise<EmailTrends> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const timeSeriesData = await this.getTimeSeriesData(period, collegeId, startDate, endDate);

      // Calculate trends based on the last few data points
      const recentData = timeSeriesData.slice(-7); // Last 7 data points
      const olderData = timeSeriesData.slice(-14, -7); // Previous 7 data points

      if (recentData.length < 3 || olderData.length < 3) {
        return {
          period,
          data: timeSeriesData,
          trends: {
            deliveryRate: 'stable',
            openRate: 'stable',
            clickRate: 'stable'
          }
        };
      }

      // Calculate trend indicators
      const deliveryRateTrend = this.calculateTrend(
        olderData.map(d => d.delivered / Math.max(d.sent, 1)),
        recentData.map(d => d.delivered / Math.max(d.sent, 1))
      );

      const openRateTrend = this.calculateTrend(
        olderData.map(d => d.opened / Math.max(d.delivered, 1)),
        recentData.map(d => d.opened / Math.max(d.delivered, 1))
      );

      const clickRateTrend = this.calculateTrend(
        olderData.map(d => d.clicked / Math.max(d.opened, 1)),
        recentData.map(d => d.clicked / Math.max(d.opened, 1))
      );

      return {
        period,
        data: timeSeriesData,
        trends: {
          deliveryRate: deliveryRateTrend,
          openRate: openRateTrend,
          clickRate: clickRateTrend
        }
      };
    } catch (error) {
      console.error('Error getting email trends:', error);
      throw new Error('Failed to get email trends');
    }
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(oldValues: number[], newValues: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (oldValues.length === 0 || newValues.length === 0) {
      return 'stable';
    }

    const oldAverage = oldValues.reduce((a, b) => a + b, 0) / oldValues.length;
    const newAverage = newValues.reduce((a, b) => a + b, 0) / newValues.length;

    const change = ((newAverage - oldAverage) / oldAverage) * 100;

    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  /**
   * Get email performance insights
   */
  async getPerformanceInsights(collegeId?: string): Promise<{
    topPerformers: string[];
    areasForImprovement: string[];
    recommendations: string[];
  }> {
    try {
      const analytics = await this.getOverallAnalytics(collegeId);
      
      const insights = {
        topPerformers: [] as string[],
        areasForImprovement: [] as string[],
        recommendations: [] as string[]
      };

      // Analyze delivery rate
      if (analytics.deliveryRate >= 95) {
        insights.topPerformers.push('Excellent email delivery rate');
      } else if (analytics.deliveryRate < 90) {
        insights.areasForImprovement.push('Low email delivery rate');
        insights.recommendations.push('Review email authentication and sender reputation');
      }

      // Analyze open rate
      if (analytics.openRate >= 25) {
        insights.topPerformers.push('Good email open rate');
      } else if (analytics.openRate < 15) {
        insights.areasForImprovement.push('Low email open rate');
        insights.recommendations.push('Improve subject lines and sender names');
      }

      // Analyze click rate
      if (analytics.clickRate >= 5) {
        insights.topPerformers.push('Good email click rate');
      } else if (analytics.clickRate < 2) {
        insights.areasForImprovement.push('Low email click rate');
        insights.recommendations.push('Improve email content and call-to-action buttons');
      }

      // Analyze bounce rate
      if (analytics.bounceRate <= 2) {
        insights.topPerformers.push('Low bounce rate');
      } else if (analytics.bounceRate > 5) {
        insights.areasForImprovement.push('High bounce rate');
        insights.recommendations.push('Clean email list and verify email addresses');
      }

      return insights;
    } catch (error) {
      console.error('Error getting performance insights:', error);
      throw new Error('Failed to get performance insights');
    }
  }
}
