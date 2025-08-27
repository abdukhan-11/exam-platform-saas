import { prisma } from '@/lib/db';
import { DataExportService, ExportOptions } from './data-export-service';

export interface CustomReportQuery {
  id: string;
  name: string;
  description: string;
  dataSource: 'analytics' | 'colleges' | 'users' | 'activity' | 'exams' | 'custom';
  queryType: 'aggregation' | 'timeSeries' | 'comparison' | 'distribution' | 'custom';
  filters: Record<string, any>;
  groupBy?: string[];
  sortBy?: string[];
  limit?: number;
  customQuery?: string;
  visualizationType?: 'chart' | 'table' | 'metric' | 'mixed';
  chartConfig?: {
    type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
    xAxis?: string;
    yAxis?: string;
    series?: string[];
    colors?: string[];
  };
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportResult {
  data: any[];
  metadata: {
    totalRecords: number;
    queryTime: number;
    generatedAt: Date;
    filters: Record<string, any>;
  };
  visualization?: {
    type: string;
    config: any;
    data: any[];
  };
}

export interface QueryBuilderField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  source: string;
  operators: string[];
  enumValues?: string[];
  description?: string;
}

export class CustomReportBuilder {
  private dataExportService: DataExportService;

  constructor() {
    this.dataExportService = new DataExportService();
  }

  /**
   * Create a new custom report query
   */
  async createCustomReportQuery(query: Omit<CustomReportQuery, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomReportQuery> {
    const now = new Date();

    const newQuery = await prisma.customReportQuery.create({
      data: {
        ...query,
        createdAt: now,
        updatedAt: now
      }
    });

    return newQuery as CustomReportQuery;
  }

  /**
   * Update an existing custom report query
   */
  async updateCustomReportQuery(id: string, updates: Partial<CustomReportQuery>): Promise<CustomReportQuery> {
    const updatedQuery = await prisma.customReportQuery.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    return updatedQuery as CustomReportQuery;
  }

  /**
   * Delete a custom report query
   */
  async deleteCustomReportQuery(id: string): Promise<void> {
    await prisma.customReportQuery.delete({
      where: { id }
    });
  }

  /**
   * Get all custom report queries
   */
  async getCustomReportQueries(): Promise<CustomReportQuery[]> {
    const queries = await prisma.customReportQuery.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return queries as CustomReportQuery[];
  }

  /**
   * Get active custom report queries
   */
  async getActiveCustomReportQueries(): Promise<CustomReportQuery[]> {
    const queries = await prisma.customReportQuery.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    return queries as CustomReportQuery[];
  }

  /**
   * Execute a custom report query
   */
  async executeCustomReportQuery(queryId: string, additionalFilters?: Record<string, any>): Promise<ReportResult> {
    const query = await prisma.customReportQuery.findUnique({
      where: { id: queryId }
    });

    if (!query) {
      throw new Error('Custom report query not found');
    }

    if (!query.isActive) {
      throw new Error('Custom report query is not active');
    }

    const startTime = Date.now();
    const combinedFilters = { ...query.filters, ...additionalFilters };

    let data: any[];
    let totalRecords: number;

    switch (query.dataSource) {
      case 'analytics':
        const analyticsData = await this.executeAnalyticsQuery(query, combinedFilters);
        data = analyticsData.data;
        totalRecords = analyticsData.total;
        break;
      case 'colleges':
        const collegesData = await this.executeCollegesQuery(query, combinedFilters);
        data = collegesData.data;
        totalRecords = collegesData.total;
        break;
      case 'users':
        const usersData = await this.executeUsersQuery(query, combinedFilters);
        data = usersData.data;
        totalRecords = usersData.total;
        break;
      case 'activity':
        const activityData = await this.executeActivityQuery(query, combinedFilters);
        data = activityData.data;
        totalRecords = activityData.total;
        break;
      case 'exams':
        const examsData = await this.executeExamsQuery(query, combinedFilters);
        data = examsData.data;
        totalRecords = examsData.total;
        break;
      case 'custom':
        const customData = await this.executeCustomQuery(query, combinedFilters);
        data = customData.data;
        totalRecords = customData.total;
        break;
      default:
        throw new Error(`Unsupported data source: ${query.dataSource}`);
    }

    // Apply grouping and sorting
    if (query.groupBy && query.groupBy.length > 0) {
      data = this.applyGrouping(data, query.groupBy);
    }

    if (query.sortBy && query.sortBy.length > 0) {
      data = this.applySorting(data, query.sortBy);
    }

    // Apply limit
    if (query.limit && query.limit > 0) {
      data = data.slice(0, query.limit);
    }

    const queryTime = Date.now() - startTime;

    // Generate visualization data if configured
    let visualization;
    if (query.visualizationType && query.chartConfig) {
      visualization = this.generateVisualization(data, query.chartConfig);
    }

    return {
      data,
      metadata: {
        totalRecords,
        queryTime,
        generatedAt: new Date(),
        filters: combinedFilters
      },
      visualization
    };
  }

  /**
   * Export custom report query results
   */
  async exportCustomReportQuery(
    queryId: string,
    format: 'csv' | 'excel' | 'pdf',
    additionalFilters?: Record<string, any>
  ): Promise<{ data: string | Buffer; filename: string; mimeType: string; size: number }> {
    const result = await this.executeCustomReportQuery(queryId, additionalFilters);
    
    // Convert result to export format
    switch (format) {
      case 'csv':
        return this.convertToCSV(result);
      case 'excel':
        return this.convertToExcel(result);
      case 'pdf':
        return this.convertToPDF(result);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Get available fields for query building
   */
  getAvailableFields(): QueryBuilderField[] {
    return [
      // Analytics fields
      { name: 'totalColleges', label: 'Total Colleges', type: 'number', source: 'analytics', operators: ['equals', 'greater_than', 'less_than'] },
      { name: 'totalUsers', label: 'Total Users', type: 'number', source: 'analytics', operators: ['equals', 'greater_than', 'less_than'] },
      { name: 'totalExams', label: 'Total Exams', type: 'number', source: 'analytics', operators: ['equals', 'greater_than', 'less_than'] },
      
      // College fields
      { name: 'college.name', label: 'College Name', type: 'string', source: 'colleges', operators: ['equals', 'contains', 'starts_with', 'ends_with'] },
      { name: 'college.subscriptionTier', label: 'Subscription Tier', type: 'enum', source: 'colleges', operators: ['equals', 'in'], enumValues: ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'] },
      { name: 'college.isActive', label: 'Active Status', type: 'boolean', source: 'colleges', operators: ['equals'] },
      { name: 'college.createdAt', label: 'Created Date', type: 'date', source: 'colleges', operators: ['equals', 'greater_than', 'less_than', 'between'] },
      
      // User fields
      { name: 'user.name', label: 'User Name', type: 'string', source: 'users', operators: ['equals', 'contains', 'starts_with', 'ends_with'] },
      { name: 'user.email', label: 'User Email', type: 'string', source: 'users', operators: ['equals', 'contains', 'starts_with', 'ends_with'] },
      { name: 'user.role', label: 'User Role', type: 'enum', source: 'users', operators: ['equals', 'in'], enumValues: ['STUDENT', 'TEACHER', 'COLLEGE_ADMIN', 'SUPER_ADMIN'] },
      { name: 'user.createdAt', label: 'Registration Date', type: 'date', source: 'users', operators: ['equals', 'greater_than', 'less_than', 'between'] },
      { name: 'user.lastLoginAt', label: 'Last Login', type: 'date', source: 'users', operators: ['equals', 'greater_than', 'less_than', 'between'] },
      
      // Activity fields
      { name: 'activity.action', label: 'Action', type: 'string', source: 'activity', operators: ['equals', 'contains', 'in'] },
      { name: 'activity.resourceType', label: 'Resource Type', type: 'string', source: 'activity', operators: ['equals', 'contains', 'in'] },
      { name: 'activity.timestamp', label: 'Timestamp', type: 'date', source: 'activity', operators: ['equals', 'greater_than', 'less_than', 'between'] },
      { name: 'activity.ipAddress', label: 'IP Address', type: 'string', source: 'activity', operators: ['equals', 'contains', 'starts_with'] },
      
      // Exam fields
      { name: 'exam.title', label: 'Exam Title', type: 'string', source: 'exams', operators: ['equals', 'contains', 'starts_with', 'ends_with'] },
      { name: 'exam.status', label: 'Exam Status', type: 'enum', source: 'exams', operators: ['equals', 'in'], enumValues: ['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] },
      { name: 'exam.createdAt', label: 'Created Date', type: 'date', source: 'exams', operators: ['equals', 'greater_than', 'less_than', 'between'] },
      { name: 'exam.startDate', label: 'Start Date', type: 'date', source: 'exams', operators: ['equals', 'greater_than', 'less_than', 'between'] },
      { name: 'exam.endDate', label: 'End Date', type: 'date', source: 'exams', operators: ['equals', 'greater_than', 'less_than', 'between'] }
    ];
  }

  /**
   * Validate custom report query
   */
  validateCustomReportQuery(query: Partial<CustomReportQuery>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!query.name || query.name.trim().length === 0) {
      errors.push('Query name is required');
    }

    if (!query.dataSource) {
      errors.push('Data source is required');
    }

    if (!query.queryType) {
      errors.push('Query type is required');
    }

    if (query.dataSource === 'custom' && !query.customQuery) {
      errors.push('Custom query is required when data source is custom');
    }

    if (query.visualizationType === 'chart' && !query.chartConfig) {
      errors.push('Chart configuration is required when visualization type is chart');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Private methods for executing different query types
  private async executeAnalyticsQuery(query: CustomReportQuery, filters: Record<string, any>): Promise<{ data: any[]; total: number }> {
    const analyticsData = await this.dataExportService.exportAnalytics({
      format: 'csv',
      filters
    });

    // Parse CSV data back to structured format for processing
    const lines = (analyticsData.data as string).split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      return row;
    });

    return { data, total: data.length };
  }

  private async executeCollegesQuery(query: CustomReportQuery, filters: Record<string, any>): Promise<{ data: any[]; total: number }> {
    const collegesData = await this.dataExportService.exportColleges({
      format: 'csv',
      filters
    });

    const lines = (collegesData.data as string).split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      return row;
    });

    return { data, total: data.length };
  }

  private async executeUsersQuery(query: CustomReportQuery, filters: Record<string, any>): Promise<{ data: any[]; total: number }> {
    const usersData = await this.dataExportService.exportUserAnalytics({
      format: 'csv',
      filters
    });

    const lines = (usersData.data as string).split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      return row;
    });

    return { data, total: data.length };
  }

  private async executeActivityQuery(query: CustomReportQuery, filters: Record<string, any>): Promise<{ data: any[]; total: number }> {
    const activityData = await this.dataExportService.exportActivityLogs({
      format: 'csv',
      filters
    });

    const lines = (activityData.data as string).split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      return row;
    });

    return { data, total: data.length };
  }

  private async executeExamsQuery(query: CustomReportQuery, filters: Record<string, any>): Promise<{ data: any[]; total: number }> {
    // This would need to be implemented based on exam data structure
    // For now, return empty data
    return { data: [], total: 0 };
  }

  private async executeCustomQuery(query: CustomReportQuery, filters: Record<string, any>): Promise<{ data: any[]; total: number }> {
    // This would execute the custom SQL query
    // For now, return empty data
    return { data: [], total: 0 };
  }

  private applyGrouping(data: any[], groupBy: string[]): any[] {
    const grouped = new Map<string, any[]>();

    for (const item of data) {
      const key = groupBy.map(field => item[field]).join('|');
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    }

    return Array.from(grouped.entries()).map(([key, items]) => {
      const result: any = {};
      const values = key.split('|');
      groupBy.forEach((field, index) => {
        result[field] = values[index];
      });
      
      // Add aggregated values
      result.count = items.length;
      result.items = items;
      
      return result;
    });
  }

  private applySorting(data: any[], sortBy: string[]): any[] {
    return data.sort((a, b) => {
      for (const field of sortBy) {
        const [fieldName, direction] = field.startsWith('-') 
          ? [field.slice(1), 'desc'] 
          : [field, 'asc'];
        
        if (a[fieldName] < b[fieldName]) return direction === 'asc' ? -1 : 1;
        if (a[fieldName] > b[fieldName]) return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private generateVisualization(data: any[], chartConfig: any): any {
    // This would generate chart data based on the configuration
    // For now, return basic structure
    return {
      type: chartConfig.type,
      config: chartConfig,
      data: data
    };
  }

  private convertToCSV(result: ReportResult): { data: string; filename: string; mimeType: string; size: number } {
    if (result.data.length === 0) {
      return {
        data: 'No data available',
        filename: 'custom-report.csv',
        mimeType: 'text/csv',
        size: 0
      };
    }

    const headers = Object.keys(result.data[0]);
    const csvContent = [
      headers.join(','),
      ...result.data.map(row => 
        headers.map(header => `"${row[header] || ''}"`).join(',')
      )
    ].join('\n');

    return {
      data: csvContent,
      filename: `custom-report-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv',
      size: Buffer.byteLength(csvContent, 'utf8')
    };
  }

  private convertToExcel(result: ReportResult): { data: string; filename: string; mimeType: string; size: number } {
    // For now, return CSV as Excel (implement proper Excel generation later)
    return this.convertToCSV(result);
  }

  private convertToPDF(result: ReportResult): { data: string; filename: string; mimeType: string; size: number } {
    // For now, return CSV as PDF (implement proper PDF generation later)
    return this.convertToCSV(result);
  }

  /**
   * Update a custom report query
   */
  async updateCustomReportQuery(id: string, updates: Partial<CustomReportQuery>): Promise<CustomReportQuery> {
    const updatedQuery = await prisma.customReportQuery.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    return updatedQuery as CustomReportQuery;
  }

  /**
   * Delete a custom report query
   */
  async deleteCustomReportQuery(id: string): Promise<void> {
    await prisma.customReportQuery.delete({
      where: { id }
    });
  }
}
