/**
 * Automated Report Generator
 *
 * This module provides comprehensive automated report generation capabilities for exam violations,
 * including detailed incident reports, summary reports, trend analysis reports, and compliance reports
 * for teachers, administrators, and academic integrity offices.
 */

import { ViolationReport } from './violation-reporting';
import { TrendPattern, CoordinationAnalysis, UserProfile } from './trend-analysis';
import { ExamSecurityEvent } from './exam-security';
import { auditLogger } from './audit-logger';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'incident' | 'summary' | 'trend' | 'compliance' | 'forensic';
  sections: ReportSection[];
  formatting: ReportFormatting;
  recipients: string[];
  triggers: ReportTrigger[];
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'details' | 'evidence' | 'recommendations' | 'statistics' | 'charts';
  content: any;
  priority: number;
  conditional?: {
    condition: string;
    value: any;
  };
}

export interface ReportFormatting {
  format: 'pdf' | 'html' | 'json' | 'csv';
  style: 'formal' | 'casual' | 'technical';
  includeCharts: boolean;
  includeEvidence: boolean;
  maxEvidenceItems: number;
  branding: {
    institutionName: string;
    logo?: string;
    footer: string;
  };
}

export interface ReportTrigger {
  type: 'severity_threshold' | 'violation_count' | 'time_interval' | 'pattern_detected' | 'user_specific';
  condition: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  title: string;
  type: ReportTemplate['type'];
  content: ReportContent;
  metadata: ReportMetadata;
  generatedAt: number;
  expiresAt?: number;
  recipients: string[];
  status: 'draft' | 'generated' | 'sent' | 'archived';
}

export interface ReportContent {
  summary: ReportSummary;
  sections: ReportSection[];
  evidence: EvidenceItem[];
  recommendations: Recommendation[];
  statistics: ReportStatistics;
  charts?: ChartData[];
}

export interface ReportSummary {
  title: string;
  description: string;
  keyFindings: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers: number;
  timePeriod: {
    start: number;
    end: number;
  };
}

export interface EvidenceItem {
  id: string;
  type: string;
  title: string;
  description: string;
  data: any;
  timestamp: number;
  source: string;
  integrityHash?: string;
}

export interface Recommendation {
  id: string;
  type: 'immediate' | 'short_term' | 'long_term';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actions: string[];
  responsibleParty: string;
  timeline: string;
}

export interface ReportStatistics {
  totalViolations: number;
  violationsByType: Record<string, number>;
  violationsBySeverity: Record<string, number>;
  violationsByUser: Record<string, number>;
  violationsByTime: TimeSeriesData[];
  averageSeverity: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  topViolationTypes: Array<{ type: string; count: number }>;
  topAffectedUsers: Array<{ userId: string; count: number }>;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  label?: string;
}

export interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  data: any;
  config: any;
}

export interface ReportMetadata {
  generatedBy: string;
  generationReason: string;
  dataSources: string[];
  filters: Record<string, any>;
  version: string;
  processingTime: number;
  dataIntegrity: boolean;
}

export interface ReportGenerationConfig {
  autoGeneration: boolean;
  generationInterval: number; // minutes
  retentionPeriod: number; // days
  maxReportsPerDay: number;
  defaultRecipients: string[];
  notificationSettings: {
    emailEnabled: boolean;
    dashboardEnabled: boolean;
    apiEnabled: boolean;
  };
  templates: ReportTemplate[];
}

class AutomatedReportGenerator {
  private static instance: AutomatedReportGenerator;
  private config: ReportGenerationConfig;
  private templates: Map<string, ReportTemplate> = new Map();
  private generatedReports: Map<string, GeneratedReport> = new Map();
  private reportQueue: Array<{ templateId: string; data: any; priority: string }> = [];
  private generationInterval: NodeJS.Timeout | null = null;

  private defaultConfig: ReportGenerationConfig = {
    autoGeneration: true,
    generationInterval: 60, // 1 hour
    retentionPeriod: 90, // 90 days
    maxReportsPerDay: 50,
    defaultRecipients: [],
    notificationSettings: {
      emailEnabled: true,
      dashboardEnabled: true,
      apiEnabled: false
    },
    templates: []
  };

  static getInstance(): AutomatedReportGenerator {
    if (!AutomatedReportGenerator.instance) {
      AutomatedReportGenerator.instance = new AutomatedReportGenerator();
    }
    return AutomatedReportGenerator.instance;
  }

  constructor() {
    this.config = { ...this.defaultConfig };
    this.initializeGenerator();
  }

  /**
   * Initialize the report generator
   */
  private initializeGenerator(): void {
    // Set up default templates
    this.createDefaultTemplates();

    // Start auto generation if enabled
    if (this.config.autoGeneration) {
      this.startAutoGeneration();
    }

    // Set up cleanup interval
    setInterval(() => {
      this.cleanupOldReports();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Create default report templates
   */
  private createDefaultTemplates(): void {
    // Incident Report Template
    const incidentTemplate: ReportTemplate = {
      id: 'incident_report',
      name: 'Security Incident Report',
      description: 'Detailed report for individual security incidents',
      type: 'incident',
      sections: [
        {
          id: 'incident_summary',
          title: 'Incident Summary',
          type: 'summary',
          content: null,
          priority: 1
        },
        {
          id: 'violation_details',
          title: 'Violation Details',
          type: 'details',
          content: null,
          priority: 2
        },
        {
          id: 'evidence_collected',
          title: 'Evidence Collected',
          type: 'evidence',
          content: null,
          priority: 3
        },
        {
          id: 'recommendations',
          title: 'Recommendations',
          type: 'recommendations',
          content: null,
          priority: 4
        }
      ],
      formatting: {
        format: 'pdf',
        style: 'formal',
        includeCharts: false,
        includeEvidence: true,
        maxEvidenceItems: 10,
        branding: {
          institutionName: 'Educational Institution',
          footer: 'Confidential - Academic Integrity Report'
        }
      },
      recipients: ['security_officer', 'department_head'],
      triggers: [
        {
          type: 'severity_threshold',
          condition: { severity: 'high' },
          priority: 'high'
        }
      ]
    };

    // Summary Report Template
    const summaryTemplate: ReportTemplate = {
      id: 'daily_summary',
      name: 'Daily Security Summary',
      description: 'Daily summary of all security violations',
      type: 'summary',
      sections: [
        {
          id: 'summary_overview',
          title: 'Summary Overview',
          type: 'summary',
          content: null,
          priority: 1
        },
        {
          id: 'violation_statistics',
          title: 'Violation Statistics',
          type: 'statistics',
          content: null,
          priority: 2
        },
        {
          id: 'charts',
          title: 'Visual Analytics',
          type: 'charts',
          content: null,
          priority: 3
        },
        {
          id: 'key_findings',
          title: 'Key Findings',
          type: 'details',
          content: null,
          priority: 4
        }
      ],
      formatting: {
        format: 'html',
        style: 'technical',
        includeCharts: true,
        includeEvidence: false,
        maxEvidenceItems: 0,
        branding: {
          institutionName: 'Educational Institution',
          footer: 'Daily Security Summary Report'
        }
      },
      recipients: ['department_head', 'exam_coordinator'],
      triggers: [
        {
          type: 'time_interval',
          condition: { interval: 'daily' },
          priority: 'medium'
        }
      ]
    };

    // Trend Analysis Report Template
    const trendTemplate: ReportTemplate = {
      id: 'trend_analysis',
      name: 'Trend Analysis Report',
      description: 'Analysis of security violation trends and patterns',
      type: 'trend',
      sections: [
        {
          id: 'trend_overview',
          title: 'Trend Overview',
          type: 'summary',
          content: null,
          priority: 1
        },
        {
          id: 'pattern_analysis',
          title: 'Pattern Analysis',
          type: 'details',
          content: null,
          priority: 2
        },
        {
          id: 'user_profiles',
          title: 'User Risk Profiles',
          type: 'details',
          content: null,
          priority: 3
        },
        {
          id: 'recommendations',
          title: 'Strategic Recommendations',
          type: 'recommendations',
          content: null,
          priority: 4
        }
      ],
      formatting: {
        format: 'pdf',
        style: 'formal',
        includeCharts: true,
        includeEvidence: false,
        maxEvidenceItems: 0,
        branding: {
          institutionName: 'Educational Institution',
          footer: 'Trend Analysis Report - Confidential'
        }
      },
      recipients: ['academic_integrity_officer', 'security_team'],
      triggers: [
        {
          type: 'pattern_detected',
          condition: { patternType: 'coordinated_cheating' },
          priority: 'critical'
        }
      ]
    };

    this.templates.set(incidentTemplate.id, incidentTemplate);
    this.templates.set(summaryTemplate.id, summaryTemplate);
    this.templates.set(trendTemplate.id, trendTemplate);
  }

  /**
   * Generate a report from a template
   */
  async generateReport(
    templateId: string,
    data: {
      violations?: ExamSecurityEvent[];
      reports?: ViolationReport[];
      trends?: TrendPattern[];
      coordinations?: CoordinationAnalysis[];
      userProfiles?: Map<string, UserProfile>;
      timeRange?: { start: number; end: number };
      filters?: Record<string, any>;
    },
    options: {
      format?: ReportTemplate['formatting']['format'];
      recipients?: string[];
      priority?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ): Promise<GeneratedReport | null> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Report template '${templateId}' not found`);
    }

    const startTime = Date.now();

    try {
      // Generate report content
      const content = await this.generateReportContent(template, data);

      // Create report metadata
      const metadata: ReportMetadata = {
        generatedBy: 'automated_system',
        generationReason: 'scheduled_generation',
        dataSources: ['exam_security_service', 'violation_reporting', 'trend_analysis'],
        filters: data.filters || {},
        version: '1.0.0',
        processingTime: 0,
        dataIntegrity: true
      };

      // Generate unique report ID
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create report object
      const report: GeneratedReport = {
        id: reportId,
        templateId,
        title: this.generateReportTitle(template, data),
        type: template.type,
        content,
        metadata,
        generatedAt: Date.now(),
        expiresAt: Date.now() + (this.config.retentionPeriod * 24 * 60 * 60 * 1000),
        recipients: options.recipients || template.recipients,
        status: 'generated'
      };

      // Update processing time
      report.metadata.processingTime = Date.now() - startTime;

      // Store report
      this.generatedReports.set(reportId, report);

      // Log report generation
      auditLogger.logSecurity('report_generated', {
        reportId,
        templateId,
        type: template.type,
        recipients: report.recipients.join(', '),
        severity: options.priority || 'medium',
        description: `Automated report generated: ${report.title}`,
        metadata: {
          processingTime: report.metadata.processingTime,
          dataSources: metadata.dataSources.length
        }
      });

      // Send notifications if enabled
      if (this.config.notificationSettings.emailEnabled) {
        await this.sendReportNotifications(report);
      }

      return report;

    } catch (error) {
      console.error('Error generating report:', error);

      // Log generation failure
      auditLogger.logSecurity('report_generation_failed', {
        templateId,
        error: error instanceof Error ? error.message : String(error),
        severity: 'medium',
        description: 'Failed to generate automated report',
        metadata: { dataKeys: Object.keys(data) }
      });

      return null;
    }
  }

  /**
   * Generate report content based on template
   */
  private async generateReportContent(
    template: ReportTemplate,
    data: any
  ): Promise<ReportContent> {
    const summary = this.generateReportSummary(template, data);
    const sections = await this.generateReportSections(template, data);
    const evidence = this.generateEvidenceItems(data);
    const recommendations = this.generateRecommendations(data);
    const statistics = this.generateReportStatistics(data);
    const charts = template.formatting.includeCharts ? this.generateCharts(data) : undefined;

    return {
      summary,
      sections,
      evidence,
      recommendations,
      statistics,
      charts
    };
  }

  /**
   * Generate report summary
   */
  private generateReportSummary(template: ReportTemplate, data: any): ReportSummary {
    const timeRange = data.timeRange || {
      start: Date.now() - (24 * 60 * 60 * 1000),
      end: Date.now()
    };

    let title = '';
    let description = '';
    let keyFindings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let affectedUsers = 0;

    switch (template.type) {
      case 'incident':
        title = 'Security Incident Report';
        description = 'Detailed analysis of a specific security incident';
        if (data.violations && data.violations.length > 0) {
          const violation = data.violations[0];
          keyFindings = [
            `Violation Type: ${violation.eventType}`,
            `Severity: ${violation.severity}`,
            `User: ${violation.userId}`,
            `Timestamp: ${new Date(violation.timestamp).toISOString()}`
          ];
          riskLevel = violation.severity === 'critical' ? 'critical' :
                     violation.severity === 'high' ? 'high' :
                     violation.severity === 'medium' ? 'medium' : 'low';
          affectedUsers = 1;
        }
        break;

      case 'summary':
        title = 'Security Summary Report';
        description = `Summary of security violations from ${new Date(timeRange.start).toLocaleDateString()} to ${new Date(timeRange.end).toLocaleDateString()}`;
        const totalViolations = data.violations ? data.violations.length : 0;
        affectedUsers = data.violations ? new Set(data.violations.map((v: ExamSecurityEvent) => v.userId)).size : 0;
        keyFindings = [
          `Total Violations: ${totalViolations}`,
          `Affected Users: ${affectedUsers}`,
          `Time Period: ${Math.round((timeRange.end - timeRange.start) / (24 * 60 * 60 * 1000))} days`
        ];
        riskLevel = totalViolations > 50 ? 'critical' : totalViolations > 25 ? 'high' : totalViolations > 10 ? 'medium' : 'low';
        break;

      case 'trend':
        title = 'Security Trend Analysis Report';
        description = 'Analysis of security violation patterns and trends';
        const patterns = data.trends ? data.trends.length : 0;
        const coordinations = data.coordinations ? data.coordinations.length : 0;
        keyFindings = [
          `Patterns Detected: ${patterns}`,
          `Coordinated Incidents: ${coordinations}`,
          `High-Risk Users: ${data.userProfiles ? Array.from(data.userProfiles.values()).filter((p: any) => (p as UserProfile).riskScore > 70).length : 0}`
        ];
        riskLevel = coordinations > 0 ? 'critical' : patterns > 5 ? 'high' : patterns > 2 ? 'medium' : 'low';
        break;

      default:
        title = 'Security Report';
        description = 'General security report';
        keyFindings = ['Report generated successfully'];
    }

    return {
      title,
      description,
      keyFindings,
      riskLevel,
      affectedUsers,
      timePeriod: timeRange
    };
  }

  /**
   * Generate report sections
   */
  private async generateReportSections(template: ReportTemplate, data: any): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];

    for (const templateSection of template.sections) {
      const section: ReportSection = {
        ...templateSection,
        content: await this.generateSectionContent(templateSection, data)
      };
      sections.push(section);
    }

    return sections;
  }

  /**
   * Generate content for a specific section
   */
  private async generateSectionContent(section: ReportSection, data: any): Promise<any> {
    switch (section.type) {
      case 'summary':
        return this.generateReportSummary(this.templates.get('summary')!, data);

      case 'details':
        return this.generateDetailedContent(data);

      case 'evidence':
        return this.generateEvidenceItems(data);

      case 'recommendations':
        return this.generateRecommendations(data);

      case 'statistics':
        return this.generateReportStatistics(data);

      case 'charts':
        return this.generateCharts(data);

      default:
        return null;
    }
  }

  /**
   * Generate detailed content
   */
  private generateDetailedContent(data: any): any {
    const details: any = {};

    if (data.violations) {
      details.violations = data.violations.map((v: ExamSecurityEvent) => ({
        id: v.id,
        type: v.eventType,
        severity: v.severity,
        timestamp: v.timestamp,
        userId: v.userId,
        details: v.details
      }));
    }

    if (data.trends) {
      details.patterns = data.trends.map((t: TrendPattern) => ({
        id: t.id,
        type: t.type,
        severity: t.severity,
        confidence: t.confidence,
        affectedUsers: t.affectedUsers,
        description: t.description
      }));
    }

    if (data.coordinations) {
      details.coordinations = data.coordinations.map((c: CoordinationAnalysis) => ({
        id: c.coordinationId,
        type: c.coordinationType,
        confidence: c.confidence,
        involvedUsers: c.involvedUsers,
        severity: c.severity
      }));
    }

    return details;
  }

  /**
   * Generate evidence items
   */
  private generateEvidenceItems(data: any): EvidenceItem[] {
    const evidence: EvidenceItem[] = [];

    // Add violation evidence
    if (data.violations) {
      data.violations.forEach((v: ExamSecurityEvent, index: number) => {
        if (index < 10) { // Limit to first 10 violations
          evidence.push({
            id: `violation_${v.id}`,
            type: 'violation_record',
            title: `Violation: ${v.eventType}`,
            description: `Security violation recorded at ${new Date(v.timestamp).toISOString()}`,
            data: v.details,
            timestamp: v.timestamp,
            source: 'exam_security_system'
          });
        }
      });
    }

    // Add trend evidence
    if (data.trends) {
      data.trends.forEach((t: TrendPattern) => {
        evidence.push({
          id: `trend_${t.id}`,
          type: 'trend_pattern',
          title: `Pattern: ${t.type}`,
          description: t.description,
          data: t.statisticalData,
          timestamp: t.detectedAt,
          source: 'trend_analysis_engine'
        });
      });
    }

    return evidence;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(data: any): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Generate recommendations based on violations
    if (data.violations && data.violations.length > 0) {
      const highSeverityCount = data.violations.filter((v: ExamSecurityEvent) => v.severity === 'high' || v.severity === 'critical').length;

      if (highSeverityCount > 0) {
        recommendations.push({
          id: 'immediate_review',
          type: 'immediate',
          priority: 'high',
          title: 'Immediate Security Review Required',
          description: `${highSeverityCount} high-severity violations detected requiring immediate attention`,
          actions: [
            'Review all high-severity violations manually',
            'Contact affected students',
            'Assess exam integrity',
            'Consider additional security measures'
          ],
          responsibleParty: 'Academic Integrity Officer',
          timeline: 'Within 24 hours'
        });
      }
    }

    // Generate recommendations based on trends
    if (data.trends && data.trends.length > 0) {
      const coordinatedCheating = data.trends.filter((t: TrendPattern) => t.type === 'coordinated_cheating');

      if (coordinatedCheating.length > 0) {
        recommendations.push({
          id: 'coordinated_cheating_investigation',
          type: 'immediate',
          priority: 'critical',
          title: 'Coordinated Cheating Investigation',
          description: 'Potential coordinated cheating detected requiring formal investigation',
          actions: [
            'Launch formal academic integrity investigation',
            'Interview involved students separately',
            'Review exam proctoring procedures',
            'Implement additional anti-cheating measures'
          ],
          responsibleParty: 'Academic Integrity Committee',
          timeline: 'Within 48 hours'
        });
      }
    }

    // Generate recommendations based on user profiles
    if (data.userProfiles) {
      const highRiskUsers = Array.from(data.userProfiles.values()).filter((p: any) => (p as UserProfile).riskScore > 70);

      if (highRiskUsers.length > 0) {
        recommendations.push({
          id: 'high_risk_user_monitoring',
          type: 'short_term',
          priority: 'medium',
          title: 'Enhanced Monitoring for High-Risk Users',
          description: `${highRiskUsers.length} users identified as high-risk requiring enhanced monitoring`,
          actions: [
            'Implement additional monitoring for identified users',
            'Review user\'s academic history',
            'Provide academic support resources',
            'Schedule counseling sessions if needed'
          ],
          responsibleParty: 'Student Support Services',
          timeline: 'Within 1 week'
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate report statistics
   */
  private generateReportStatistics(data: any): ReportStatistics {
    const violations = data.violations || [];
    const userProfiles = data.userProfiles || new Map();

    // Count violations by type
    const violationsByType: Record<string, number> = {};
    violations.forEach((v: ExamSecurityEvent) => {
      violationsByType[v.eventType] = (violationsByType[v.eventType] || 0) + 1;
    });

    // Count violations by severity
    const violationsBySeverity: Record<string, number> = {};
    violations.forEach((v: ExamSecurityEvent) => {
      violationsBySeverity[v.severity] = (violationsBySeverity[v.severity] || 0) + 1;
    });

    // Count violations by user
    const violationsByUser: Record<string, number> = {};
    violations.forEach((v: ExamSecurityEvent) => {
      violationsByUser[v.userId] = (violationsByUser[v.userId] || 0) + 1;
    });

    // Generate time series data (simplified)
    const violationsByTime: TimeSeriesData[] = [];
    const timeBuckets: Record<number, number> = {};

    violations.forEach((v: ExamSecurityEvent) => {
      const hour = Math.floor(v.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);
      timeBuckets[hour] = (timeBuckets[hour] || 0) + 1;
    });

    Object.entries(timeBuckets).forEach(([timestamp, count]) => {
      violationsByTime.push({
        timestamp: parseInt(timestamp),
        value: count
      });
    });

    // Calculate average severity
    const severityValues = violations.map((v: ExamSecurityEvent) => {
      switch (v.severity) {
        case 'low': return 1;
        case 'medium': return 2;
        case 'high': return 3;
        case 'critical': return 4;
        default: return 1;
      }
    });
    const averageSeverity = severityValues.length > 0
      ? severityValues.reduce((sum: number, val: number) => sum + val, 0) / severityValues.length
      : 0;

    // Determine trend direction (simplified)
    const recentHalf = violations.slice(0, Math.floor(violations.length / 2));
    const olderHalf = violations.slice(Math.floor(violations.length / 2));

    const recentAvg = recentHalf.length > 0
      ? recentHalf.reduce((sum: number, v: ExamSecurityEvent) => sum + (v.severity === 'high' || v.severity === 'critical' ? 1 : 0), 0) / recentHalf.length
      : 0;
    const olderAvg = olderHalf.length > 0
      ? olderHalf.reduce((sum: number, v: ExamSecurityEvent) => sum + (v.severity === 'high' || v.severity === 'critical' ? 1 : 0), 0) / olderHalf.length
      : 0;

    let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAvg > olderAvg + 0.1) trendDirection = 'increasing';
    else if (recentAvg < olderAvg - 0.1) trendDirection = 'decreasing';

    // Get top violation types
    const topViolationTypes = Object.entries(violationsByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // Get top affected users
    const topAffectedUsers = Object.entries(violationsByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => ({ userId, count }));

    return {
      totalViolations: violations.length,
      violationsByType,
      violationsBySeverity,
      violationsByUser,
      violationsByTime,
      averageSeverity,
      trendDirection,
      topViolationTypes,
      topAffectedUsers
    };
  }

  /**
   * Generate charts data
   */
  private generateCharts(data: any): ChartData[] {
    const charts: ChartData[] = [];

    if (data.violations) {
      // Violations by type pie chart
      const violationsByType = data.violations.reduce((acc: Record<string, number>, v: ExamSecurityEvent) => {
        acc[v.eventType] = (acc[v.eventType] || 0) + 1;
        return acc;
      }, {});

      charts.push({
        id: 'violations_by_type',
        type: 'pie',
        title: 'Violations by Type',
        data: violationsByType,
        config: {
          colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
        }
      });

      // Violations over time line chart
      const timeSeries = data.violations
        .sort((a: ExamSecurityEvent, b: ExamSecurityEvent) => a.timestamp - b.timestamp)
        .map((v: ExamSecurityEvent) => ({
          timestamp: v.timestamp,
          count: 1
        }));

      charts.push({
        id: 'violations_over_time',
        type: 'line',
        title: 'Violations Over Time',
        data: timeSeries,
        config: {
          xAxis: 'timestamp',
          yAxis: 'count',
          smooth: true
        }
      });
    }

    return charts;
  }

  /**
   * Generate report title
   */
  private generateReportTitle(template: ReportTemplate, data: any): string {
    const dateStr = new Date().toISOString().split('T')[0];

    switch (template.type) {
      case 'incident':
        return `Security Incident Report - ${dateStr}`;
      case 'summary':
        return `Security Summary Report - ${dateStr}`;
      case 'trend':
        return `Security Trend Analysis - ${dateStr}`;
      case 'compliance':
        return `Compliance Report - ${dateStr}`;
      case 'forensic':
        return `Forensic Analysis Report - ${dateStr}`;
      default:
        return `Security Report - ${dateStr}`;
    }
  }

  /**
   * Send report notifications
   */
  private async sendReportNotifications(report: GeneratedReport): Promise<void> {
    if (!this.config.notificationSettings.emailEnabled) return;

    try {
      // In a real implementation, this would send actual emails
      console.log(`Sending report notifications to: ${report.recipients.join(', ')}`);
      console.log(`Report: ${report.title}`);

      // Log notification sending
      auditLogger.logSecurity('report_notification_sent', {
        reportId: report.id,
        recipients: report.recipients.join(', '),
        severity: 'low',
        description: `Report notification sent to ${report.recipients.length} recipients`,
        metadata: {
          reportTitle: report.title,
          reportType: report.type
        }
      });

    } catch (error) {
      console.error('Error sending report notifications:', error);
    }
  }

  /**
   * Start auto generation
   */
  private startAutoGeneration(): void {
    this.generationInterval = setInterval(() => {
      this.processReportQueue();
    }, this.config.generationInterval * 60 * 1000);
  }

  /**
   * Process report queue
   */
  private async processReportQueue(): Promise<void> {
    if (this.reportQueue.length === 0) return;

    // Process high priority reports first
    const highPriorityReports = this.reportQueue.filter(r => r.priority === 'high' || r.priority === 'critical');
    const otherReports = this.reportQueue.filter(r => r.priority !== 'high' && r.priority !== 'critical');

    const reportsToProcess = [...highPriorityReports, ...otherReports];

    for (const reportRequest of reportsToProcess) {
      try {
        await this.generateReport(reportRequest.templateId, reportRequest.data, {
          priority: reportRequest.priority as any
        });
      } catch (error) {
        console.error('Error processing queued report:', error);
      }
    }

    // Clear processed reports
    this.reportQueue.length = 0;
  }

  /**
   * Queue report for generation
   */
  queueReport(templateId: string, data: any, priority: string = 'medium'): void {
    this.reportQueue.push({ templateId, data, priority });
  }

  /**
   * Clean up old reports
   */
  private cleanupOldReports(): void {
    const cutoffTime = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);

    for (const [reportId, report] of this.generatedReports.entries()) {
      if (report.expiresAt && report.expiresAt < cutoffTime) {
        this.generatedReports.delete(reportId);
      }
    }
  }

  /**
   * Get generated report
   */
  getReport(reportId: string): GeneratedReport | null {
    return this.generatedReports.get(reportId) || null;
  }

  /**
   * Get all generated reports
   */
  getAllReports(filters?: {
    type?: string;
    status?: string;
    startDate?: number;
    endDate?: number;
  }): GeneratedReport[] {
    let reports = Array.from(this.generatedReports.values());

    if (filters) {
      if (filters.type) {
        reports = reports.filter(r => r.type === filters.type);
      }
      if (filters.status) {
        reports = reports.filter(r => r.status === filters.status);
      }
      if (filters.startDate) {
        reports = reports.filter(r => r.generatedAt >= filters.startDate!);
      }
      if (filters.endDate) {
        reports = reports.filter(r => r.generatedAt <= filters.endDate!);
      }
    }

    return reports.sort((a, b) => b.generatedAt - a.generatedAt);
  }

  /**
   * Get report template
   */
  getTemplate(templateId: string): ReportTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Add custom template
   */
  addTemplate(template: ReportTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ReportGenerationConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart auto generation if settings changed
    if (newConfig.autoGeneration !== undefined) {
      if (newConfig.autoGeneration && !this.generationInterval) {
        this.startAutoGeneration();
      } else if (!newConfig.autoGeneration && this.generationInterval) {
        clearInterval(this.generationInterval);
        this.generationInterval = null;
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ReportGenerationConfig {
    return { ...this.config };
  }

  /**
   * Export report data
   */
  exportReportData(reportId: string, format: 'json' | 'pdf' | 'html' = 'json'): any {
    const report = this.generatedReports.get(reportId);
    if (!report) return null;

    if (format === 'json') {
      return report;
    }

    // In a real implementation, this would generate PDF/HTML formats
    return this.convertReportToFormat(report, format);
  }

  /**
   * Convert report to different format
   */
  private convertReportToFormat(report: GeneratedReport, format: string): any {
    // This would implement actual format conversion
    // For now, return the report as-is
    return report;
  }

  /**
   * Shutdown the generator
   */
  shutdown(): void {
    if (this.generationInterval) {
      clearInterval(this.generationInterval);
      this.generationInterval = null;
    }

    this.templates.clear();
    this.generatedReports.clear();
    this.reportQueue.length = 0;
  }
}

export const automatedReportGenerator = AutomatedReportGenerator.getInstance();
export default automatedReportGenerator;
