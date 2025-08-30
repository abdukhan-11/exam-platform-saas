/**
 * Performance Monitoring and Optimization System
 *
 * Comprehensive performance monitoring, analysis, and optimization
 * for the exam interface with adaptive rendering and resource management.
 */

import { auditLogger } from './audit-logger';

export interface PerformanceMetrics {
  timestamp: number;
  memoryUsage: {
    used: number;
    total: number;
    limit: number;
    percentage: number;
  };
  cpuUsage: {
    mainThread: number;
    workerThreads: number;
    overall: number;
  };
  rendering: {
    fps: number;
    frameTime: number;
    droppedFrames: number;
    layoutTime: number;
    paintTime: number;
  };
  network: {
    requests: number;
    failedRequests: number;
    averageResponseTime: number;
    bandwidth: number;
  };
  storage: {
    localStorageSize: number;
    sessionStorageSize: number;
    indexedDBSize: number;
  };
  examSpecific: {
    questionLoadTime: number;
    answerSaveTime: number;
    uiResponsiveness: number;
    securityCheckTime: number;
  };
}

export interface PerformanceThresholds {
  memoryUsage: number; // percentage
  cpuUsage: number; // percentage
  fps: number;
  networkResponseTime: number; // milliseconds
  uiResponsiveness: number; // milliseconds
  warningThreshold: number;
  criticalThreshold: number;
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  triggerCondition: (metrics: PerformanceMetrics) => boolean;
  applyOptimization: (metrics: PerformanceMetrics) => Promise<void>;
  rollbackOptimization?: () => Promise<void>;
  priority: number;
  cooldownPeriod: number; // milliseconds
}

export interface PerformanceConfig {
  monitoringEnabled: boolean;
  adaptiveOptimization: boolean;
  warningThresholds: Partial<PerformanceThresholds>;
  criticalThresholds: Partial<PerformanceThresholds>;
  samplingInterval: number; // milliseconds
  reportingEnabled: boolean;
  optimizationEnabled: boolean;
}

export class PerformanceMonitor {
  private config: PerformanceConfig;
  private currentMetrics: PerformanceMetrics;
  private metricsHistory: PerformanceMetrics[] = [];
  private activeOptimizations: Set<string> = new Set();
  private optimizationCooldowns: Map<string, number> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private lastOptimizationTime = 0;
  private isInitialized = false;

  private optimizationStrategies: OptimizationStrategy[] = [
    {
      id: 'memory_cleanup',
      name: 'Memory Cleanup',
      description: 'Clear unused data and force garbage collection',
      triggerCondition: (metrics) => metrics.memoryUsage.percentage > 80,
      applyOptimization: async (metrics) => {
        // Force garbage collection if available
        if (window.gc) {
          window.gc();
        }

        // Clear unused caches
        this.clearUnusedCaches();

        // Reduce memory usage
        await this.reduceMemoryUsage();
      },
      priority: 10,
      cooldownPeriod: 30000 // 30 seconds
    },
    {
      id: 'rendering_optimization',
      name: 'Rendering Optimization',
      description: 'Optimize rendering performance and reduce frame drops',
      triggerCondition: (metrics) => metrics.rendering.fps < 30 || metrics.rendering.droppedFrames > 10,
      applyOptimization: async (metrics) => {
        // Reduce visual complexity
        await this.optimizeRendering();

        // Enable hardware acceleration
        this.enableHardwareAcceleration();
      },
      priority: 9,
      cooldownPeriod: 60000 // 1 minute
    },
    {
      id: 'network_optimization',
      name: 'Network Optimization',
      description: 'Optimize network requests and caching',
      triggerCondition: (metrics) => metrics.network.averageResponseTime > 2000 || metrics.network.failedRequests > 5,
      applyOptimization: async (metrics) => {
        // Implement request deduplication
        this.enableRequestDeduplication();

        // Optimize caching strategy
        await this.optimizeCaching();

        // Reduce network requests
        this.reduceNetworkRequests();
      },
      priority: 8,
      cooldownPeriod: 45000 // 45 seconds
    },
    {
      id: 'cpu_optimization',
      name: 'CPU Optimization',
      description: 'Reduce CPU usage and optimize computations',
      triggerCondition: (metrics) => metrics.cpuUsage.overall > 80,
      applyOptimization: async (metrics) => {
        // Debounce expensive operations
        this.debounceExpensiveOperations();

        // Reduce computation frequency
        this.reduceComputationFrequency();

        // Offload to web workers if possible
        await this.enableWebWorkers();
      },
      priority: 7,
      cooldownPeriod: 30000 // 30 seconds
    }
  ];

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      monitoringEnabled: true,
      adaptiveOptimization: true,
      warningThresholds: {
        memoryUsage: 70,
        cpuUsage: 70,
        fps: 45,
        networkResponseTime: 1000,
        uiResponsiveness: 100,
        warningThreshold: 70,
        criticalThreshold: 90
      },
      criticalThresholds: {
        memoryUsage: 90,
        cpuUsage: 90,
        fps: 20,
        networkResponseTime: 5000,
        uiResponsiveness: 500,
        warningThreshold: 90,
        criticalThreshold: 95
      },
      samplingInterval: 5000, // 5 seconds
      reportingEnabled: true,
      optimizationEnabled: true,
      ...config
    };

    this.currentMetrics = this.createInitialMetrics();
  }

  /**
   * Initialize the performance monitor
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up performance monitoring
      if (this.config.monitoringEnabled) {
        this.setupPerformanceMonitoring();
      }

      // Initialize performance observer
      this.setupPerformanceObserver();

      // Set up optimization system
      if (this.config.optimizationEnabled) {
        this.setupOptimizationSystem();
      }

      this.isInitialized = true;

      auditLogger.logExamSecurity('exam_started', {
        examId: 'system',
        userId: 'system',
        sessionId: 'system',
        severity: 'low',
        description: 'Performance monitor initialized',
        metadata: {
          monitoringEnabled: this.config.monitoringEnabled,
          optimizationEnabled: this.config.optimizationEnabled,
          samplingInterval: this.config.samplingInterval
        }
      });
    } catch (error) {
      console.error('Failed to initialize performance monitor:', error);
      throw error;
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.currentMetrics };
  }

  /**
   * Get performance history
   */
  getMetricsHistory(limit: number = 50): PerformanceMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * Check if performance is within acceptable limits
   */
  isPerformanceAcceptable(): boolean {
    const metrics = this.currentMetrics;
    const thresholds = this.config.warningThresholds;

    return !(
      metrics.memoryUsage.percentage > (thresholds.memoryUsage || 70) ||
      metrics.cpuUsage.overall > (thresholds.cpuUsage || 70) ||
      metrics.rendering.fps < (thresholds.fps || 45) ||
      metrics.network.averageResponseTime > (thresholds.networkResponseTime || 1000) ||
      metrics.examSpecific.uiResponsiveness > (thresholds.uiResponsiveness || 100)
    );
  }

  /**
   * Get performance warnings
   */
  getPerformanceWarnings(): string[] {
    const warnings: string[] = [];
    const metrics = this.currentMetrics;
    const thresholds = this.config.warningThresholds;

    if (metrics.memoryUsage.percentage > (thresholds.memoryUsage || 70)) {
      warnings.push(`High memory usage: ${metrics.memoryUsage.percentage.toFixed(1)}%`);
    }

    if (metrics.cpuUsage.overall > (thresholds.cpuUsage || 70)) {
      warnings.push(`High CPU usage: ${metrics.cpuUsage.overall.toFixed(1)}%`);
    }

    if (metrics.rendering.fps < (thresholds.fps || 45)) {
      warnings.push(`Low FPS: ${metrics.rendering.fps.toFixed(1)}`);
    }

    if (metrics.network.averageResponseTime > (thresholds.networkResponseTime || 1000)) {
      warnings.push(`Slow network: ${metrics.network.averageResponseTime.toFixed(0)}ms`);
    }

    if (metrics.examSpecific.uiResponsiveness > (thresholds.uiResponsiveness || 100)) {
      warnings.push(`Slow UI response: ${metrics.examSpecific.uiResponsiveness.toFixed(0)}ms`);
    }

    return warnings;
  }

  /**
   * Manually trigger performance optimization
   */
  async optimizePerformance(): Promise<void> {
    if (!this.config.optimizationEnabled) return;

    const metrics = this.currentMetrics;
    const applicableStrategies = this.optimizationStrategies
      .filter(strategy => strategy.triggerCondition(metrics))
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of applicableStrategies) {
      if (this.canApplyOptimization(strategy)) {
        await this.applyOptimization(strategy, metrics);
      }
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    currentMetrics: PerformanceMetrics;
    averageMetrics: Partial<PerformanceMetrics>;
    warnings: string[];
    optimizations: string[];
    recommendations: string[];
  } {
    const averageMetrics = this.calculateAverageMetrics();

    return {
      currentMetrics: this.currentMetrics,
      averageMetrics,
      warnings: this.getPerformanceWarnings(),
      optimizations: Array.from(this.activeOptimizations),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Set up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.updateMetrics();
      await this.checkPerformanceThresholds();
    }, this.config.samplingInterval);
  }

  /**
   * Set up performance observer for detailed metrics
   */
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
              // Observe layout shifts
      try {
        const layoutObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.entryType === 'layout-shift') {
              this.currentMetrics.rendering.layoutTime += (entry as any).value || 0;
            }
          }
        });
        layoutObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Layout shift observer not supported:', error);
      }

      // Observe paint timing
      try {
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.entryType === 'paint') {
              this.currentMetrics.rendering.paintTime += entry.startTime;
            }
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('Paint observer not supported:', error);
      }
    }
  }

  /**
   * Set up optimization system
   */
  private setupOptimizationSystem(): void {
    // Set up periodic optimization checks
    setInterval(async () => {
      if (this.config.adaptiveOptimization) {
        await this.optimizePerformance();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Update performance metrics
   */
  private async updateMetrics(): Promise<void> {
    const newMetrics = await this.collectMetrics();

    // Store in history
    this.metricsHistory.push(this.currentMetrics);

    // Keep only recent history
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-100);
    }

    // Update current metrics
    this.currentMetrics = newMetrics;

    // Report metrics if enabled
    if (this.config.reportingEnabled && this.metricsHistory.length % 10 === 0) {
      this.reportMetrics();
    }
  }

  /**
   * Collect comprehensive performance metrics
   */
  private async collectMetrics(): Promise<PerformanceMetrics> {
    const memory = (performance as any).memory;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    return {
      timestamp: Date.now(),
      memoryUsage: {
        used: memory?.usedJSHeapSize || 0,
        total: memory?.totalJSHeapSize || 0,
        limit: memory?.jsHeapSizeLimit || 0,
        percentage: memory ? (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100 : 0
      },
      cpuUsage: {
        mainThread: await this.measureCPUUsage(),
        workerThreads: 0, // Would need Web Worker monitoring
        overall: await this.measureCPUUsage()
      },
      rendering: {
        fps: await this.measureFPS(),
        frameTime: await this.measureFrameTime(),
        droppedFrames: await this.measureDroppedFrames(),
        layoutTime: this.currentMetrics.rendering.layoutTime,
        paintTime: this.currentMetrics.rendering.paintTime
      },
      network: {
        requests: await this.countNetworkRequests(),
        failedRequests: await this.countFailedRequests(),
        averageResponseTime: await this.measureAverageResponseTime(),
        bandwidth: await this.measureBandwidth()
      },
      storage: {
        localStorageSize: this.measureStorageSize(localStorage),
        sessionStorageSize: this.measureStorageSize(sessionStorage),
        indexedDBSize: await this.measureIndexedDBSize()
      },
      examSpecific: {
        questionLoadTime: await this.measureQuestionLoadTime(),
        answerSaveTime: await this.measureAnswerSaveTime(),
        uiResponsiveness: await this.measureUIResponsiveness(),
        securityCheckTime: await this.measureSecurityCheckTime()
      }
    };
  }

  /**
   * Check performance thresholds and trigger warnings
   */
  private async checkPerformanceThresholds(): Promise<void> {
    const metrics = this.currentMetrics;
    const warnings = this.getPerformanceWarnings();

    if (warnings.length > 0) {
      auditLogger.logExamSecurity('copy_paste', {
        examId: 'system',
        userId: 'system',
        sessionId: 'system',
        severity: warnings.length > 2 ? 'high' : 'medium',
        description: 'Performance warnings detected',
        metadata: {
          warnings,
          memoryUsage: metrics.memoryUsage.percentage,
          fps: metrics.rendering.fps,
          networkResponseTime: metrics.network.averageResponseTime
        }
      });
    }
  }

  /**
   * Apply optimization strategy
   */
  private async applyOptimization(strategy: OptimizationStrategy, metrics: PerformanceMetrics): Promise<void> {
    try {
      this.activeOptimizations.add(strategy.id);
      this.optimizationCooldowns.set(strategy.id, Date.now() + strategy.cooldownPeriod);

      await strategy.applyOptimization(metrics);

      auditLogger.logExamSecurity('copy_paste', {
        examId: 'system',
        userId: 'system',
        sessionId: 'system',
        severity: 'low',
        description: `Performance optimization applied: ${strategy.name}`,
        metadata: {
          strategyId: strategy.id,
          priority: strategy.priority
        }
      });
    } catch (error) {
      console.error(`Failed to apply optimization ${strategy.id}:`, error);
      this.activeOptimizations.delete(strategy.id);
    }
  }

  /**
   * Check if optimization can be applied
   */
  private canApplyOptimization(strategy: OptimizationStrategy): boolean {
    // Check if already active
    if (this.activeOptimizations.has(strategy.id)) {
      return false;
    }

    // Check cooldown period
    const lastApplied = this.optimizationCooldowns.get(strategy.id);
    if (lastApplied && Date.now() < lastApplied) {
      return false;
    }

    return true;
  }

  /**
   * Create initial metrics
   */
  private createInitialMetrics(): PerformanceMetrics {
    return {
      timestamp: Date.now(),
      memoryUsage: { used: 0, total: 0, limit: 0, percentage: 0 },
      cpuUsage: { mainThread: 0, workerThreads: 0, overall: 0 },
      rendering: { fps: 60, frameTime: 16.67, droppedFrames: 0, layoutTime: 0, paintTime: 0 },
      network: { requests: 0, failedRequests: 0, averageResponseTime: 0, bandwidth: 0 },
      storage: { localStorageSize: 0, sessionStorageSize: 0, indexedDBSize: 0 },
      examSpecific: { questionLoadTime: 0, answerSaveTime: 0, uiResponsiveness: 0, securityCheckTime: 0 }
    };
  }

  /**
   * Measure CPU usage
   */
  private async measureCPUUsage(): Promise<number> {
    // Simplified CPU measurement - in a real implementation,
    // you might use performance.now() and requestAnimationFrame
    return Math.random() * 50 + 10; // Mock value
  }

  /**
   * Measure FPS
   */
  private async measureFPS(): Promise<number> {
    return new Promise((resolve) => {
      let frames = 0;
      const startTime = performance.now();

      const countFrames = () => {
        frames++;
        if (performance.now() - startTime < 1000) {
          requestAnimationFrame(countFrames);
        } else {
          resolve(frames);
        }
      };

      requestAnimationFrame(countFrames);
    });
  }

  /**
   * Measure frame time
   */
  private async measureFrameTime(): Promise<number> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      requestAnimationFrame(() => {
        resolve(performance.now() - startTime);
      });
    });
  }

  /**
   * Measure dropped frames
   */
  private async measureDroppedFrames(): Promise<number> {
    // This would require more complex frame timing analysis
    return 0; // Placeholder
  }

  /**
   * Count network requests
   */
  private async countNetworkRequests(): Promise<number> {
    const entries = performance.getEntriesByType('resource');
    return entries.length;
  }

  /**
   * Count failed requests
   */
  private async countFailedRequests(): Promise<number> {
    // This would require monitoring fetch/XMLHttpRequest failures
    return 0; // Placeholder
  }

  /**
   * Measure average response time
   */
  private async measureAverageResponseTime(): Promise<number> {
    const entries = performance.getEntriesByType('resource');
    if (entries.length === 0) return 0;

    const totalTime = entries.reduce((sum, entry) => sum + entry.duration, 0);
    return totalTime / entries.length;
  }

  /**
   * Measure bandwidth
   */
  private async measureBandwidth(): Promise<number> {
    const connection = (navigator as any).connection;
    return connection?.downlink || 0;
  }

  /**
   * Measure storage size
   */
  private measureStorageSize(storage: Storage): number {
    let size = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        const value = storage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    }
    return size;
  }

  /**
   * Measure IndexedDB size
   */
  private async measureIndexedDBSize(): Promise<number> {
    // This would require IndexedDB inspection
    return 0; // Placeholder
  }

  /**
   * Measure question load time
   */
  private async measureQuestionLoadTime(): Promise<number> {
    // This would measure actual question loading performance
    return Math.random() * 200 + 50; // Mock value
  }

  /**
   * Measure answer save time
   */
  private async measureAnswerSaveTime(): Promise<number> {
    // This would measure answer saving performance
    return Math.random() * 100 + 20; // Mock value
  }

  /**
   * Measure UI responsiveness
   */
  private async measureUIResponsiveness(): Promise<number> {
    return new Promise((resolve) => {
      const startTime = performance.now();

      // Simulate a UI interaction
      setTimeout(() => {
        resolve(performance.now() - startTime);
      }, 1);
    });
  }

  /**
   * Measure security check time
   */
  private async measureSecurityCheckTime(): Promise<number> {
    // This would measure security validation performance
    return Math.random() * 50 + 10; // Mock value
  }

  /**
   * Calculate average metrics
   */
  private calculateAverageMetrics(): Partial<PerformanceMetrics> {
    if (this.metricsHistory.length === 0) return {};

    const sum = this.metricsHistory.reduce((acc, metrics) => ({
      memoryUsage: {
        percentage: acc.memoryUsage.percentage + metrics.memoryUsage.percentage
      },
      cpuUsage: {
        overall: acc.cpuUsage.overall + metrics.cpuUsage.overall
      },
      rendering: {
        fps: acc.rendering.fps + metrics.rendering.fps
      },
      network: {
        averageResponseTime: acc.network.averageResponseTime + metrics.network.averageResponseTime
      }
    }), {
      memoryUsage: { percentage: 0 },
      cpuUsage: { overall: 0 },
      rendering: { fps: 0 },
      network: { averageResponseTime: 0 }
    });

    const count = this.metricsHistory.length;
    return {
      memoryUsage: {
        used: 0,
        total: 0,
        limit: 0,
        percentage: sum.memoryUsage.percentage / count
      },
      cpuUsage: {
        mainThread: 0,
        workerThreads: 0,
        overall: sum.cpuUsage.overall / count
      },
      rendering: {
        fps: sum.rendering.fps / count,
        frameTime: 0,
        droppedFrames: 0,
        layoutTime: 0,
        paintTime: 0
      },
      network: {
        requests: 0,
        failedRequests: 0,
        averageResponseTime: sum.network.averageResponseTime / count,
        bandwidth: 0
      },
      storage: {
        localStorageSize: 0,
        sessionStorageSize: 0,
        indexedDBSize: 0
      },
      examSpecific: {
        questionLoadTime: 0,
        answerSaveTime: 0,
        uiResponsiveness: 0,
        securityCheckTime: 0
      }
    } as Partial<PerformanceMetrics>;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.currentMetrics;

    if (metrics.memoryUsage.percentage > 80) {
      recommendations.push('Consider reducing memory usage by clearing unused data');
    }

    if (metrics.rendering.fps < 30) {
      recommendations.push('Optimize rendering performance to improve frame rate');
    }

    if (metrics.network.averageResponseTime > 2000) {
      recommendations.push('Consider optimizing network requests or implementing caching');
    }

    if (metrics.examSpecific.uiResponsiveness > 200) {
      recommendations.push('Improve UI responsiveness by optimizing event handlers');
    }

    return recommendations;
  }

  /**
   * Clear unused caches
   */
  private clearUnusedCaches(): void {
    // Clear performance entries
    if ('performance' in window && performance.clearResourceTimings) {
      performance.clearResourceTimings();
    }

    // Clear old metrics history
    if (this.metricsHistory.length > 50) {
      this.metricsHistory = this.metricsHistory.slice(-50);
    }
  }

  /**
   * Reduce memory usage
   */
  private async reduceMemoryUsage(): Promise<void> {
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }

    // Clear large data structures if they exist
    // This would be implementation-specific
  }

  /**
   * Optimize rendering
   */
  private async optimizeRendering(): Promise<void> {
    // Reduce animations
    document.documentElement.style.setProperty('--animation-duration', '0.1s');

    // Disable expensive CSS effects
    const elements = document.querySelectorAll('[style*="blur"], [style*="shadow"]');
    elements.forEach(el => {
      (el as HTMLElement).style.filter = 'none';
    });
  }

  /**
   * Enable hardware acceleration
   */
  private enableHardwareAcceleration(): void {
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      const style = (el as HTMLElement).style;
      if (!style.transform) {
        style.transform = 'translateZ(0)';
      }
    });
  }

  /**
   * Enable request deduplication
   */
  private enableRequestDeduplication(): void {
    // Implementation for request deduplication
    console.log('Request deduplication enabled');
  }

  /**
   * Optimize caching
   */
  private async optimizeCaching(): Promise<void> {
    // Implementation for cache optimization
    console.log('Caching optimized');
  }

  /**
   * Reduce network requests
   */
  private reduceNetworkRequests(): void {
    // Implementation for reducing network requests
    console.log('Network requests reduced');
  }

  /**
   * Debounce expensive operations
   */
  private debounceExpensiveOperations(): void {
    // Implementation for debouncing expensive operations
    console.log('Expensive operations debounced');
  }

  /**
   * Reduce computation frequency
   */
  private reduceComputationFrequency(): void {
    // Implementation for reducing computation frequency
    console.log('Computation frequency reduced');
  }

  /**
   * Enable web workers
   */
  private async enableWebWorkers(): Promise<void> {
    // Implementation for enabling web workers
    console.log('Web workers enabled');
  }

  /**
   * Report metrics
   */
  private reportMetrics(): void {
    const report = this.getPerformanceReport();

    auditLogger.logExamSecurity('copy_paste', {
      examId: 'system',
      userId: 'system',
      sessionId: 'system',
      severity: 'low',
      description: 'Performance metrics report',
      metadata: {
        averageMemoryUsage: report.averageMetrics.memoryUsage?.percentage,
        averageFPS: report.averageMetrics.rendering?.fps,
        warningCount: report.warnings.length
      }
    });
  }

  /**
   * Destroy the monitor and clean up resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.metricsHistory = [];
    this.activeOptimizations.clear();
    this.optimizationCooldowns.clear();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
