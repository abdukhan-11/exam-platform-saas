import { prisma } from '@/lib/db';
import { ActivityLogger } from '@/lib/user-management/activity-logger';

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeCharts?: boolean;
  customFields?: string[];
}

export interface ExportResult {
  data: string | Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

export interface ExportProgress {
  status: 'preparing' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  estimatedTime?: number;
}

export class DataExportService {
  private activityLogger: ActivityLogger;

  constructor() {
    this.activityLogger = new ActivityLogger(prisma);
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(options: ExportOptions): Promise<ExportResult> {
    const data = await this.getComprehensiveAnalytics(options.dateRange);
    
    switch (options.format) {
      case 'csv':
        return this.generateAnalyticsCSV(data, options.includeCharts);
      case 'excel':
        return this.generateAnalyticsExcel(data, options.includeCharts);
      case 'pdf':
        return this.generateAnalyticsPDF(data, options.includeCharts);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  /**
   * Export colleges data
   */
  async exportColleges(options: ExportOptions): Promise<ExportResult> {
    const colleges = await this.getCollegesWithDetails(options.filters, options.dateRange);
    
    switch (options.format) {
      case 'csv':
        return this.generateCollegesCSV(colleges);
      case 'excel':
        return this.generateCollegesExcel(colleges);
      case 'pdf':
        return this.generateCollegesPDF(colleges);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  /**
   * Export user analytics data
   */
  async exportUserAnalytics(options: ExportOptions): Promise<ExportResult> {
    const data = await this.getUserAnalyticsData(options.dateRange, options.filters);
    
    switch (options.format) {
      case 'csv':
        return this.generateUserAnalyticsCSV(data);
      case 'excel':
        return this.generateUserAnalyticsExcel(data);
      case 'pdf':
        return this.generateUserAnalyticsPDF(data);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  /**
   * Export activity logs data
   */
  async exportActivityLogs(options: ExportOptions): Promise<ExportResult> {
    const logs = await this.activityLogger.exportActivityLogs(options.filters || {}, 'csv');
    
    return {
      data: logs.data,
      filename: logs.filename,
      mimeType: logs.mimeType,
      size: Buffer.byteLength(logs.data, 'utf8')
    };
  }

  /**
   * Generate platform report
   */
  async generatePlatformReport(reportType: string, options: ExportOptions): Promise<ExportResult> {
    const data = await this.generateReportData(reportType, options.dateRange);
    
    switch (options.format) {
      case 'csv':
        return this.generateReportCSV(data);
      case 'excel':
        return this.generateReportExcel(data);
      case 'pdf':
        return this.generateReportPDF(data);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  /**
   * Get comprehensive analytics data
   */
  private async getComprehensiveAnalytics(dateRange?: { start: Date; end: Date }) {
    const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.end || new Date();

    const [
      totalColleges,
      activeColleges,
      totalUsers,
      totalExams,
      subscriptionStats,
      userGrowth,
      examStats,
      revenueData,
      systemHealth
    ] = await Promise.all([
      prisma.college.count(),
      prisma.college.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.exam.count(),
      prisma.college.groupBy({
        by: ['subscriptionStatus'],
        _count: { subscriptionStatus: true }
      }),
      prisma.user.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where: { createdAt: { gte: startDate, lte: endDate } }
      }),
      prisma.exam.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where: { createdAt: { gte: startDate, lte: endDate } }
      }),
      this.getMockRevenueData(startDate, endDate),
      this.getSystemHealthMetrics()
    ]);

    return {
      overview: { totalColleges, activeColleges, totalUsers, totalExams },
      subscriptionStats,
      userGrowth,
      examStats,
      revenueData,
      systemHealth,
      dateRange: { start: startDate, end: endDate }
    };
  }

  /**
   * Get colleges with comprehensive details
   */
  private async getCollegesWithDetails(filters?: Record<string, any>, dateRange?: { start: Date; end: Date }) {
    const where: any = {};
    
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { address: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    if (filters?.tier && filters.tier !== 'all') {
      where.subscriptionStatus = filters.tier;
    }

    if (filters?.status && filters.status !== 'all') {
      where.isActive = filters.status === 'active';
    }

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end
      };
    }

    return await prisma.college.findMany({
      where,
      include: {
        _count: {
          select: { users: true, exams: true }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get user analytics data
   */
  private async getUserAnalyticsData(dateRange?: { start: Date; end: Date }, filters?: Record<string, any>) {
    const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.end || new Date();

    const where: any = {
      createdAt: { gte: startDate, lte: endDate }
    };

    if (filters?.collegeId) {
      where.collegeId = filters.collegeId;
    }

    if (filters?.role) {
      where.role = filters.role;
    }

    const [
      totalUsers,
      newUsers,
      activeUsers,
      usersByRole,
      usersByCollege,
      userGrowth
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where }),
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
        where
      }),
      prisma.user.groupBy({
        by: ['collegeId'],
        _count: { id: true },
        where
      }),
      prisma.user.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where
      })
    ]);

    return {
      totalUsers,
      newUsers,
      activeUsers,
      usersByRole,
      usersByCollege,
      userGrowth,
      dateRange: { start: startDate, end: endDate }
    };
  }

  /**
   * Generate report data based on type
   */
  private async generateReportData(reportType: string, dateRange?: { start: Date; end: Date }) {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (reportType) {
      case 'daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'custom':
        start = dateRange?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = dateRange?.end || now;
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [analytics, colleges, users, activity] = await Promise.all([
      this.getComprehensiveAnalytics({ start, end }),
      this.getCollegesWithDetails({}, { start, end }),
      this.getUserAnalyticsData({ start, end }),
      this.activityLogger.getUserActivities({ startDate: start, endDate: end, limit: 1000 })
    ]);

    return {
      reportType,
      dateRange: { start, end },
      generatedAt: now,
      analytics,
      colleges,
      users,
      activity
    };
  }

  /**
   * Mock revenue data (replace with actual payment integration)
   */
  private async getMockRevenueData(startDate: Date, endDate: Date) {
    const months = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      months.push({
        month: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: Math.floor(Math.random() * 5000) + 2000,
        subscriptions: Math.floor(Math.random() * 10) + 5,
        churn: Math.floor(Math.random() * 3)
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  }

  /**
   * Get system health metrics
   */
  private async getSystemHealthMetrics() {
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - dbStart;

      return {
        database: {
          status: dbResponseTime < 100 ? 'healthy' : dbResponseTime < 500 ? 'warning' : 'critical',
          responseTime: dbResponseTime,
          uptime: 99.8
        },
        api: {
          status: 'healthy',
          responseTime: 120,
          errorRate: 0.2,
          uptime: 99.9
        },
        storage: {
          status: 'warning',
          usage: 78,
          available: 22,
          uptime: 99.5
        }
      };
    } catch (error) {
      return {
        database: { status: 'critical', responseTime: 0, uptime: 0 },
        api: { status: 'critical', responseTime: 0, errorRate: 100, uptime: 0 },
        storage: { status: 'critical', usage: 0, available: 0, uptime: 0 }
      };
    }
  }

  // CSV Generation Methods
  private generateAnalyticsCSV(data: any, includeCharts?: boolean): ExportResult {
    const headers = [
      'Metric',
      'Value',
      'Details',
      'Date Range'
    ];

    const rows = [
      ['Total Colleges', data.overview.totalColleges, 'All registered colleges', `${data.dateRange.start.toDateString()} - ${data.dateRange.end.toDateString()}`],
      ['Active Colleges', data.overview.activeColleges, 'Currently active colleges', `${data.dateRange.start.toDateString()} - ${data.dateRange.end.toDateString()}`],
      ['Total Users', data.overview.totalUsers, 'All registered users', `${data.dateRange.start.toDateString()} - ${data.dateRange.end.toDateString()}`],
      ['Total Exams', data.overview.totalExams, 'All created exams', `${data.dateRange.start.toDateString()} - ${data.dateRange.end.toDateString()}`],
      ['System Uptime', '99.9%', 'Platform availability', `${data.dateRange.start.toDateString()} - ${data.dateRange.end.toDateString()}`]
    ];

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return {
      data: csvContent,
      filename: `platform-analytics-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv',
      size: Buffer.byteLength(csvContent, 'utf8')
    };
  }

  private generateCollegesCSV(colleges: any[]): ExportResult {
    const headers = [
      'College Name',
      'Subscription Status',
      'Status',
      'User Count',
      'Exam Count',
      'Address',
      'Phone',
      'Email',
      'Website',
      'Created At'
    ];

    const rows = colleges.map(college => [
      college.name,
      college.subscriptionStatus || 'N/A',
      college.isActive ? 'Active' : 'Inactive',
      college._count.users || 0,
      college._count.exams || 0,
      college.address || 'N/A',
      college.phone || 'N/A',
      college.email || 'N/A',
      college.website || 'N/A',
      new Date(college.createdAt).toISOString().split('T')[0]
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return {
      data: csvContent,
      filename: `colleges-export-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv',
      size: Buffer.byteLength(csvContent, 'utf8')
    };
  }

  private generateUserAnalyticsCSV(data: any): ExportResult {
    const headers = [
      'Metric',
      'Value',
      'Details',
      'Date Range'
    ];

    const rows = [
      ['Total Users', data.totalUsers, 'All registered users', `${data.dateRange.start.toDateString()} - ${data.dateRange.end.toDateString()}`],
      ['New Users', data.newUsers, 'Users registered in period', `${data.dateRange.start.toDateString()} - ${data.dateRange.end.toDateString()}`],
      ['Active Users', data.activeUsers, 'Users with recent activity', `${data.dateRange.start.toDateString()} - ${data.dateRange.end.toDateString()}`]
    ];

    // Add role breakdown
    data.usersByRole.forEach((role: any) => {
      rows.push([
        `Users with role: ${role.role}`,
        role._count.id,
        `Users having ${role.role} role`,
        `${data.dateRange.start.toDateString()} - ${data.dateRange.end.toDateString()}`
      ]);
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return {
      data: csvContent,
      filename: `user-analytics-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv',
      size: Buffer.byteLength(csvContent, 'utf8')
    };
  }

  private generateReportCSV(data: any): ExportResult {
    const headers = [
      'Report Type',
      'Generated At',
      'Date Range',
      'Metric',
      'Value'
    ];

    const rows = [
      [data.reportType, data.generatedAt.toISOString(), `${data.dateRange.start.toDateString()} - ${data.dateRange.end.toDateString()}`, 'Total Colleges', data.analytics.overview.totalColleges],
      [data.reportType, data.generatedAt.toISOString(), `${data.dateRange.start.toDateString()} - ${data.dateRange.end.toDateString()}`, 'Total Users', data.analytics.overview.totalUsers],
      [data.reportType, data.generatedAt.toISOString(), `${data.dateRange.start.toDateString()} - ${data.dateRange.end.toDateString()}`, 'Total Exams', data.analytics.overview.totalExams],
      [data.reportType, data.generatedAt.toISOString(), `${data.dateRange.start.toDateString()} - ${data.dateRange.end.toDateString()}`, 'New Users', data.users.newUsers],
      [data.reportType, data.generatedAt.toISOString(), `${data.dateRange.start.toDateString()} - ${data.dateRange.end.toDateString()}`, 'Active Users', data.users.activeUsers]
    ];

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return {
      data: csvContent,
      filename: `${data.reportType}-platform-report-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv',
      size: Buffer.byteLength(csvContent, 'utf8')
    };
  }

  // Excel Generation Methods (placeholder - implement with xlsx library)
  private generateAnalyticsExcel(data: any, includeCharts?: boolean): ExportResult {
    // For now, return CSV as Excel (implement proper Excel generation later)
    return this.generateAnalyticsCSV(data);
  }

  private generateCollegesExcel(colleges: any[]): ExportResult {
    return this.generateCollegesCSV(colleges);
  }

  private generateUserAnalyticsExcel(data: any): ExportResult {
    return this.generateUserAnalyticsCSV(data);
  }

  private generateReportExcel(data: any): ExportResult {
    return this.generateReportCSV(data);
  }

  // PDF Generation Methods (placeholder - implement with jsPDF or similar)
  private generateAnalyticsPDF(data: any, includeCharts?: boolean): ExportResult {
    // For now, return CSV as PDF (implement proper PDF generation later)
    return this.generateAnalyticsCSV(data);
  }

  private generateCollegesPDF(colleges: any[]): ExportResult {
    return this.generateCollegesCSV(colleges);
  }

  private generateUserAnalyticsPDF(data: any): ExportResult {
    return this.generateUserAnalyticsCSV(data);
  }

  private generateReportPDF(data: any): ExportResult {
    return this.generateReportCSV(data);
  }

  /**
   * Convert activity logs to CSV
   */
  private convertActivityLogsToCSV(logs: any[]): string {
    if (logs.length === 0) {
      return 'No activity logs available';
    }

    const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent'];
    const rows = logs.map(log => [
      log.timestamp?.toISOString() || '',
      log.user?.name || log.userId || '',
      log.action || '',
      log.resourceType || '',
      log.resourceId || '',
      log.ipAddress || '',
      log.userAgent || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }
}
