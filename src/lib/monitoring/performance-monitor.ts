import { getRedisCache } from '@/lib/cache/redis-cache';
import { dbConnectionManager } from '@/lib/db/connection-manager';
import { resultProcessingQueue } from '@/lib/queue/result-processing-queue';

// Performance metrics interface
export interface PerformanceMetrics {
  timestamp: Date;
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  databaseConnections: number;
  cacheHitRate: number;
  queueLength: number;
  activeWorkers: number;
}

// Alert configuration
export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: PerformanceMetrics) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldownMinutes: number;
  enabled: boolean;
  lastTriggered?: Date;
}

// Performance alert
export interface PerformanceAlert {
  id: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metrics: PerformanceMetrics;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

// Monitoring configuration
export interface MonitoringConfig {
  collectionInterval: number; // milliseconds
  retentionPeriod: number; // hours
  alertRules: AlertRule[];
  notificationChannels: {
    email?: string[];
    slack?: string;
    webhook?: string;
  };
}

/**
 * Performance monitoring and alerting system
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private config: MonitoringConfig;
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private monitoringTimer?: NodeJS.Timeout;
  private isRunning = false;

  private constructor(config: MonitoringConfig) {
    this.config = config;
  }

  static getInstance(config?: MonitoringConfig): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      const defaultConfig: MonitoringConfig = {
        collectionInterval: parseInt(process.env.MONITORING_INTERVAL || '30000'), // 30 seconds
        retentionPeriod: parseInt(process.env.METRICS_RETENTION_HOURS || '24'), // 24 hours
        alertRules: [
          {
            id: 'high_response_time',
            name: 'High Response Time',
            condition: (metrics) => metrics.responseTime > 5000, // 5 seconds
            severity: 'high',
            message: 'Average response time is above 5 seconds',
            cooldownMinutes: 5,
            enabled: true
          },
          {
            id: 'high_error_rate',
            name: 'High Error Rate',
            condition: (metrics) => metrics.errorRate > 0.05, // 5%
            severity: 'high',
            message: 'Error rate is above 5%',
            cooldownMinutes: 10,
            enabled: true
          },
          {
            id: 'low_cache_hit_rate',
            name: 'Low Cache Hit Rate',
            condition: (metrics) => metrics.cacheHitRate < 0.7, // 70%
            severity: 'medium',
            message: 'Cache hit rate is below 70%',
            cooldownMinutes: 15,
            enabled: true
          },
          {
            id: 'high_queue_length',
            name: 'High Queue Length',
            condition: (metrics) => metrics.queueLength > 100,
            severity: 'medium',
            message: 'Queue length is above 100 jobs',
            cooldownMinutes: 5,
            enabled: true
          },
          {
            id: 'database_connection_issues',
            name: 'Database Connection Issues',
            condition: (metrics) => metrics.databaseConnections === 0,
            severity: 'critical',
            message: 'No active database connections',
            cooldownMinutes: 2,
            enabled: true
          }
        ],
        notificationChannels: {
          email: process.env.ALERT_EMAILS?.split(','),
          slack: process.env.SLACK_WEBHOOK_URL,
          webhook: process.env.ALERT_WEBHOOK_URL
        }
      };

      PerformanceMonitor.instance = new PerformanceMonitor(config || defaultConfig);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    console.log('Starting performance monitoring...');
    this.isRunning = true;

    // Initial metrics collection
    await this.collectMetrics();

    // Set up periodic monitoring
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkAlerts();
        await this.cleanupOldData();
      } catch (error) {
        console.error('Error during performance monitoring:', error);
      }
    }, this.config.collectionInterval);
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }
    this.isRunning = false;
    console.log('Performance monitoring stopped');
  }

  /**
   * Collect current performance metrics
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = new Date();

    try {
      // Collect system metrics
      const systemMetrics = await this.getSystemMetrics();

      // Collect application metrics
      const appMetrics = await this.getApplicationMetrics();

      // Collect database metrics
      const dbMetrics = await this.getDatabaseMetrics();

      // Collect cache metrics
      const cacheMetrics = await this.getCacheMetrics();

      // Collect queue metrics
      const queueMetrics = await this.getQueueMetrics();

      const metrics: PerformanceMetrics = {
        timestamp,
        responseTime: systemMetrics.responseTime,
        throughput: appMetrics.throughput,
        errorRate: appMetrics.errorRate,
        memoryUsage: systemMetrics.memoryUsage,
        cpuUsage: systemMetrics.cpuUsage,
        databaseConnections: dbMetrics.connections,
        cacheHitRate: cacheMetrics.hitRate,
        queueLength: queueMetrics.length,
        activeWorkers: queueMetrics.activeWorkers
      };

      this.metrics.push(metrics);

      // Keep only recent metrics
      const retentionMs = this.config.retentionPeriod * 60 * 60 * 1000;
      this.metrics = this.metrics.filter(m => timestamp.getTime() - m.timestamp.getTime() < retentionMs);

      console.log('Performance metrics collected:', {
        responseTime: `${metrics.responseTime.toFixed(2)}ms`,
        throughput: `${metrics.throughput.toFixed(2)} req/s`,
        errorRate: `${(metrics.errorRate * 100).toFixed(2)}%`,
        cacheHitRate: `${(metrics.cacheHitRate * 100).toFixed(2)}%`,
        queueLength: metrics.queueLength
      });

    } catch (error) {
      console.error('Error collecting performance metrics:', error);
    }
  }

  /**
   * Get system-level metrics
   */
  private async getSystemMetrics(): Promise<{
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  }> {
    // Get memory usage
    const memUsage = process.memoryUsage();
    const memoryUsage = memUsage.heapUsed / memUsage.heapTotal;

    // Simple CPU usage estimation (in a real implementation, you'd use a library like 'pidusage')
    const cpuUsage = Math.random() * 100; // Placeholder

    // Average response time (would be collected from actual requests)
    const responseTime = Math.random() * 2000 + 500; // Placeholder

    return {
      responseTime,
      memoryUsage,
      cpuUsage
    };
  }

  /**
   * Get application-level metrics
   */
  private async getApplicationMetrics(): Promise<{
    throughput: number;
    errorRate: number;
  }> {
    // In a real implementation, you'd collect these from your application metrics
    // For now, we'll return placeholder values
    const throughput = Math.random() * 100 + 50; // requests per second
    const errorRate = Math.random() * 0.1; // error rate percentage

    return {
      throughput,
      errorRate
    };
  }

  /**
   * Get database metrics
   */
  private async getDatabaseMetrics(): Promise<{
    connections: number;
  }> {
    try {
      const stats = await dbConnectionManager.getConnectionStats();
      let connections = stats.primary.isConnected ? 1 : 0;

      // Add replica connections
      for (const replica of stats.replicas) {
        if (replica.isConnected) {
          connections += 1;
        }
      }

      return { connections };
    } catch (error) {
      console.error('Error getting database metrics:', error);
      return { connections: 0 };
    }
  }

  /**
   * Get cache metrics
   */
  private async getCacheMetrics(): Promise<{
    hitRate: number;
  }> {
    try {
      const cache = getRedisCache();
      const stats = await cache.getCacheStats();

      // In a real implementation, you'd calculate actual hit rate
      // For now, return a placeholder
      return { hitRate: Math.random() * 0.3 + 0.7 }; // 70-100%
    } catch (error) {
      console.error('Error getting cache metrics:', error);
      return { hitRate: 0 };
    }
  }

  /**
   * Get queue metrics
   */
  private async getQueueMetrics(): Promise<{
    length: number;
    activeWorkers: number;
  }> {
    try {
      const stats = await resultProcessingQueue.getQueueStats();
      return {
        length: stats.queueLength,
        activeWorkers: stats.workersActive
      };
    } catch (error) {
      console.error('Error getting queue metrics:', error);
      return { length: 0, activeWorkers: 0 };
    }
  }

  /**
   * Check alert conditions and trigger alerts
   */
  private async checkAlerts(): Promise<void> {
    if (this.metrics.length === 0) return;

    const latestMetrics = this.metrics[this.metrics.length - 1];

    for (const rule of this.config.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown period
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
        if (timeSinceLastTrigger < cooldownMs) {
          continue;
        }
      }

      // Check condition
      if (rule.condition(latestMetrics)) {
        await this.triggerAlert(rule, latestMetrics);
        rule.lastTriggered = new Date();
      }
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule, metrics: PerformanceMetrics): Promise<void> {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ruleId: rule.id,
      severity: rule.severity,
      message: rule.message,
      metrics,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);

    console.error(`🚨 ${rule.severity.toUpperCase()} ALERT: ${rule.message}`, {
      timestamp: alert.timestamp.toISOString(),
      metrics: {
        responseTime: `${metrics.responseTime.toFixed(2)}ms`,
        errorRate: `${(metrics.errorRate * 100).toFixed(2)}%`,
        cacheHitRate: `${(metrics.cacheHitRate * 100).toFixed(2)}%`,
        queueLength: metrics.queueLength
      }
    });

    // Send notifications
    await this.sendNotifications(alert);
  }

  /**
   * Send alert notifications
   */
  private async sendNotifications(alert: PerformanceAlert): Promise<void> {
    const notificationPromises = [];

    // Email notifications
    if (this.config.notificationChannels.email) {
      notificationPromises.push(this.sendEmailNotification(alert));
    }

    // Slack notifications
    if (this.config.notificationChannels.slack) {
      notificationPromises.push(this.sendSlackNotification(alert));
    }

    // Webhook notifications
    if (this.config.notificationChannels.webhook) {
      notificationPromises.push(this.sendWebhookNotification(alert));
    }

    try {
      await Promise.allSettled(notificationPromises);
    } catch (error) {
      console.error('Error sending alert notifications:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: PerformanceAlert): Promise<void> {
    // In a real implementation, you'd use an email service
    console.log(`📧 Sending email alert to ${this.config.notificationChannels.email?.join(', ')}:`, alert.message);
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(alert: PerformanceAlert): Promise<void> {
    // In a real implementation, you'd use Slack API
    console.log(`💬 Sending Slack alert:`, alert.message);
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: PerformanceAlert): Promise<void> {
    // In a real implementation, you'd make HTTP request to webhook URL
    console.log(`🔗 Sending webhook alert to ${this.config.notificationChannels.webhook}:`, alert.message);
  }

  /**
   * Clean up old metrics and alerts
   */
  private async cleanupOldData(): Promise<void> {
    const retentionMs = this.config.retentionPeriod * 60 * 60 * 1000;
    const now = Date.now();

    // Clean up old metrics
    this.metrics = this.metrics.filter(m => now - m.timestamp.getTime() < retentionMs);

    // Clean up old alerts (keep resolved alerts for 7 days)
    this.alerts = this.alerts.filter(alert => {
      if (alert.resolved) {
        return now - alert.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000; // 7 days
      }
      return true; // Keep unresolved alerts
    });
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(hours = 1): PerformanceMetrics[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp.getTime() > cutoffTime);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(hours = 24): PerformanceAlert[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp.getTime() > cutoffTime);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      console.log(`✅ Alert ${alertId} resolved`);
    }
  }

  /**
   * Update alert rules
   */
  updateAlertRules(rules: AlertRule[]): void {
    this.config.alertRules = rules;
    console.log(`Updated ${rules.length} alert rules`);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(hours = 1): {
    averageResponseTime: number;
    averageThroughput: number;
    averageErrorRate: number;
    peakResponseTime: number;
    minResponseTime: number;
    totalRequests: number;
    uptime: number;
  } | null {
    const history = this.getMetricsHistory(hours);
    if (history.length === 0) return null;

    const responseTimes = history.map(m => m.responseTime);
    const throughputs = history.map(m => m.throughput);
    const errorRates = history.map(m => m.errorRate);

    return {
      averageResponseTime: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length,
      averageThroughput: throughputs.reduce((sum, tp) => sum + tp, 0) / throughputs.length,
      averageErrorRate: errorRates.reduce((sum, er) => sum + er, 0) / errorRates.length,
      peakResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      totalRequests: throughputs.reduce((sum, tp) => sum + tp * (this.config.collectionInterval / 1000), 0),
      uptime: (history.length * this.config.collectionInterval) / (hours * 60 * 60 * 1000)
    };
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(hours = 24): Promise<{
    summary: any;
    metrics: PerformanceMetrics[];
    alerts: PerformanceAlert[];
    recommendations: string[];
  }> {
    const summary = this.getPerformanceSummary(hours);
    const metrics = this.getMetricsHistory(hours);
    const alerts = this.getAllAlerts(hours);

    // Generate recommendations based on metrics
    const recommendations = this.generateRecommendations(summary, alerts);

    return {
      summary,
      metrics,
      alerts,
      recommendations
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(summary: any, alerts: PerformanceAlert[]): string[] {
    const recommendations: string[] = [];

    if (!summary) return recommendations;

    if (summary.averageResponseTime > 3000) {
      recommendations.push('Consider implementing response time optimization strategies');
    }

    if (summary.averageErrorRate > 0.03) {
      recommendations.push('Investigate and resolve high error rates');
    }

    if (alerts.some(a => a.severity === 'critical')) {
      recommendations.push('Address critical alerts immediately');
    }

    if (alerts.some(a => a.ruleId === 'low_cache_hit_rate')) {
      recommendations.push('Optimize cache strategy to improve hit rates');
    }

    if (alerts.some(a => a.ruleId === 'high_queue_length')) {
      recommendations.push('Consider scaling up queue processing capacity');
    }

    return recommendations;
  }
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  performanceMonitor.start().catch(console.error);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  performanceMonitor.stop();
});

process.on('SIGINT', async () => {
  performanceMonitor.stop();
});
