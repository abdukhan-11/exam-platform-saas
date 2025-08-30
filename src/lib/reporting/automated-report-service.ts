import { DataExportService, ExportOptions } from './data-export-service';

export interface ReportSchedule {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  format: 'csv' | 'excel' | 'pdf';
  recipients: string[];
  time: string; // HH:mm format
  dayOfWeek?: number; // 0-6 for weekly, undefined for daily/monthly
  dayOfMonth?: number; // 1-31 for monthly
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  filters?: Record<string, any>;
  customFields?: string[];
  includeCharts?: boolean;
  createdBy?: string; // User ID who created the schedule
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'analytics' | 'colleges' | 'users' | 'activity' | 'comprehensive';
  defaultFormat: 'csv' | 'excel' | 'pdf';
  defaultFilters?: Record<string, any>;
  defaultFields?: string[];
  includeCharts?: boolean;
  isSystem?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportExecution {
  id: string;
  scheduleId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  fileSize?: number;
  downloadUrl?: string;
  recipients: string[];
  sentAt?: Date;
  createdAt: Date;
}

export class AutomatedReportService {
  private dataExportService: DataExportService;
  
  // In-memory storage for development (can be replaced with database later)
  private schedules: Map<string, ReportSchedule> = new Map();
  private templates: Map<string, ReportTemplate> = new Map();
  private executions: Map<string, ReportExecution> = new Map();
  private scheduleCounter = 0;
  private templateCounter = 0;
  private executionCounter = 0;
  private systemTemplatesInitialized = false;

  constructor() {
    this.dataExportService = new DataExportService();
    // Initialize system templates lazily when first accessed
  }

  /**
   * Create a new report schedule
   */
  async createReportSchedule(schedule: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportSchedule> {
    const now = new Date();
    const nextRun = this.calculateNextRun(schedule.type, schedule.time, schedule.dayOfWeek, schedule.dayOfMonth);
    
    const newSchedule: ReportSchedule = {
      ...schedule,
      id: `schedule_${++this.scheduleCounter}`,
      nextRun,
      createdAt: now,
      updatedAt: now
    };

    this.schedules.set(newSchedule.id, newSchedule);
    return newSchedule;
  }

  /**
   * Update an existing report schedule
   */
  async updateReportSchedule(id: string, updates: Partial<ReportSchedule>): Promise<ReportSchedule> {
    const existingSchedule = this.schedules.get(id);
    if (!existingSchedule) {
      throw new Error('Report schedule not found');
    }

    const updatedSchedule: ReportSchedule = {
      ...existingSchedule,
      ...updates,
      updatedAt: new Date(),
      nextRun: updates.type || updates.time || updates.dayOfWeek || updates.dayOfMonth 
        ? this.calculateNextRun(
            updates.type || existingSchedule.type,
            updates.time || existingSchedule.time,
            updates.dayOfWeek,
            updates.dayOfMonth
          )
        : existingSchedule.nextRun
    };

    this.schedules.set(id, updatedSchedule);
    return updatedSchedule;
  }

  /**
   * Delete a report schedule
   */
  async deleteReportSchedule(id: string): Promise<void> {
    if (!this.schedules.has(id)) {
      throw new Error('Report schedule not found');
    }
    this.schedules.delete(id);
  }

  /**
   * Get all report schedules
   */
  async getReportSchedules(): Promise<ReportSchedule[]> {
    return Array.from(this.schedules.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get active report schedules
   */
  async getActiveReportSchedules(): Promise<ReportSchedule[]> {
    return Array.from(this.schedules.values())
      .filter(schedule => schedule.isActive)
      .sort((a, b) => {
        if (!a.nextRun || !b.nextRun) return 0;
        return new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime();
      });
  }

  /**
   * Execute a report schedule
   */
  async executeReportSchedule(scheduleId: string): Promise<ReportExecution> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error('Report schedule not found');
    }

    if (!schedule.isActive) {
      throw new Error('Report schedule is not active');
    }

    // Create execution record
    const execution: ReportExecution = {
      id: `execution_${++this.executionCounter}`,
      scheduleId,
      status: 'running',
      startedAt: new Date(),
      recipients: schedule.recipients,
      createdAt: new Date()
    };

    this.executions.set(execution.id, execution);

    try {
      // Generate the report
      const exportOptions: ExportOptions = {
        format: schedule.format,
        filters: schedule.filters,
        includeCharts: schedule.includeCharts,
        customFields: schedule.customFields
      };

      let exportResult;
      switch (schedule.type) {
        case 'daily':
        case 'weekly':
        case 'monthly':
        case 'custom':
          exportResult = await this.dataExportService.generatePlatformReport(schedule.type, exportOptions);
          break;
        default:
          throw new Error(`Unsupported report type: ${schedule.type}`);
      }

      // Update execution record
      const updatedExecution: ReportExecution = {
        ...execution,
        status: 'completed',
        completedAt: new Date(),
        fileSize: exportResult.size,
        downloadUrl: `/api/reports/download/${execution.id}` // This would need to be implemented
      };

      this.executions.set(execution.id, updatedExecution);

      // Send email to recipients
      // await this.sendReportEmail(schedule, exportResult, updatedExecution); // Removed email functionality

      // Update schedule last run
      const updatedSchedule: ReportSchedule = {
        ...schedule,
        lastRun: new Date(),
        nextRun: this.calculateNextRun(schedule.type, schedule.time, schedule.dayOfWeek, schedule.dayOfMonth)
      };
      this.schedules.set(scheduleId, updatedSchedule);

      return updatedExecution;

    } catch (error) {
      // Update execution record with error
      const failedExecution: ReportExecution = {
        ...execution,
        status: 'failed',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      this.executions.set(execution.id, failedExecution);
      throw error;
    }
  }

  /**
   * Execute all due report schedules
   */
  async executeDueReports(): Promise<ReportExecution[]> {
    const now = new Date();
    const dueSchedules = Array.from(this.schedules.values()).filter(schedule => 
      schedule.isActive && schedule.nextRun && schedule.nextRun <= now
    );

    const executions: ReportExecution[] = [];

    for (const schedule of dueSchedules) {
      try {
        const execution = await this.executeReportSchedule(schedule.id);
        executions.push(execution);
      } catch (error) {
        console.error(`Failed to execute report schedule ${schedule.id}:`, error);
      }
    }

    return executions;
  }

  /**
   * Create a report template
   */
  async createReportTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportTemplate> {
    const now = new Date();
    
    const newTemplate: ReportTemplate = {
      ...template,
      id: `template_${++this.templateCounter}`,
      createdAt: now,
      updatedAt: now
    };

    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  /**
   * Get all report templates
   */
  async getReportTemplates(): Promise<ReportTemplate[]> {
    return Array.from(this.templates.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get system report templates
   */
  async getSystemReportTemplates(): Promise<ReportTemplate[]> {
    if (!this.systemTemplatesInitialized) {
      await this.initializeSystemTemplates();
    }
    return Array.from(this.templates.values())
      .filter(template => template.isSystem)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Generate a report using a template
   */
  async generateReportFromTemplate(
    templateId: string,
    options: Partial<ExportOptions> = {}
  ): Promise<{ data: any; filename: string; mimeType: string; size: number }> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Report template not found');
    }

    const exportOptions: ExportOptions = {
      format: options.format || template.defaultFormat,
      filters: { ...template.defaultFilters, ...options.filters },
      customFields: options.customFields || template.defaultFields,
      includeCharts: options.includeCharts ?? template.includeCharts
    };

    switch (template.type) {
      case 'analytics':
        return await this.dataExportService.exportAnalytics(exportOptions);
      case 'colleges':
        return await this.dataExportService.exportColleges(exportOptions);
      case 'users':
        return await this.dataExportService.exportUserAnalytics(exportOptions);
      case 'activity':
        return await this.dataExportService.exportActivityLogs(exportOptions);
      case 'comprehensive':
        return await this.dataExportService.generatePlatformReport('custom', exportOptions);
      default:
        throw new Error(`Unsupported template type: ${template.type}`);
    }
  }

  /**
   * Initialize system report templates
   */
  private async initializeSystemTemplates(): Promise<void> {
    const existingTemplates = await this.getSystemReportTemplates();
    
    if (existingTemplates.length > 0) {
      return; // Already initialized
    }

    const systemTemplates: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Platform Overview',
        description: 'Comprehensive platform statistics and key metrics',
        type: 'comprehensive',
        defaultFormat: 'pdf',
        includeCharts: true,
        isSystem: true
      },
      {
        name: 'College Analytics',
        description: 'Detailed college performance and subscription analytics',
        type: 'colleges',
        defaultFormat: 'excel',
        includeCharts: false,
        isSystem: true
      },
      {
        name: 'User Growth Report',
        description: 'User registration trends and engagement metrics',
        type: 'users',
        defaultFormat: 'csv',
        includeCharts: true,
        isSystem: true
      },
      {
        name: 'System Health Report',
        description: 'Platform infrastructure and performance metrics',
        type: 'analytics',
        defaultFormat: 'pdf',
        includeCharts: true,
        isSystem: true
      },
      {
        name: 'Activity Log Summary',
        description: 'User activity and system access logs',
        type: 'activity',
        defaultFormat: 'csv',
        includeCharts: false,
        isSystem: true
      }
    ];

    for (const template of systemTemplates) {
      await this.createReportTemplate(template);
    }
    this.systemTemplatesInitialized = true;
  }

  /**
   * Calculate next run time for a schedule
   */
  private calculateNextRun(
    type: string,
    time: string,
    dayOfWeek?: number,
    dayOfMonth?: number
  ): Date {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, move to next occurrence
    if (nextRun <= now) {
      switch (type) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'weekly':
          if (dayOfWeek !== undefined) {
            const currentDay = nextRun.getDay();
            const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
            nextRun.setDate(nextRun.getDate() + daysToAdd);
          } else {
            nextRun.setDate(nextRun.getDate() + 7);
          }
          break;
        case 'monthly':
          if (dayOfMonth !== undefined) {
            nextRun.setDate(dayOfMonth);
            if (nextRun <= now) {
              nextRun.setMonth(nextRun.getMonth() + 1);
              nextRun.setDate(dayOfMonth);
            }
          } else {
            nextRun.setMonth(nextRun.getMonth() + 1);
          }
          break;
      }
    }

    return nextRun;
  }

  /**
   * Get report execution history
   */
  async getReportExecutionHistory(scheduleId?: string, limit: number = 50): Promise<ReportExecution[]> {
    let executions = Array.from(this.executions.values());
    
    if (scheduleId) {
      executions = executions.filter(exec => exec.scheduleId === scheduleId);
    }

    return executions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Clean up old report executions
   */
  async cleanupOldExecutions(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let deletedCount = 0;
    const executionsToDelete = Array.from(this.executions.entries())
      .filter(([id, execution]) => execution.createdAt < cutoffDate);
    
    for (const [id] of executionsToDelete) {
      this.executions.delete(id);
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * Update a report template
   */
  async updateReportTemplate(id: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const existingTemplate = this.templates.get(id);
    if (!existingTemplate) {
      throw new Error('Report template not found');
    }

    const updatedTemplate: ReportTemplate = {
      ...existingTemplate,
      ...updates,
      updatedAt: new Date()
    };

    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  /**
   * Delete a report template
   */
  async deleteReportTemplate(id: string): Promise<void> {
    if (!this.templates.has(id)) {
      throw new Error('Report template not found');
    }
    this.templates.delete(id);
  }
}
