/**
 * Evidence Collection Service
 *
 * This module provides comprehensive evidence collection capabilities for exam security violations,
 * including automated screenshot capture, behavior data recording, system information gathering,
 * and secure evidence storage with integrity verification.
 */

import { ExamSecurityEvent } from './exam-security';
import { ViolationEvidence } from './violation-reporting';
import { auditLogger } from './audit-logger';

export interface ScreenshotOptions {
  quality?: number; // 0-1
  format?: 'png' | 'jpeg' | 'webp';
  maxWidth?: number;
  maxHeight?: number;
  includeCursor?: boolean;
}

export interface BehaviorSnapshot {
  timestamp: number;
  mousePosition: { x: number; y: number };
  scrollPosition: { x: number; y: number };
  activeElement: string;
  keyboardState: { pressedKeys: string[] };
  windowState: {
    focused: boolean;
    minimized: boolean;
    size: { width: number; height: number };
  };
  networkActivity: {
    activeRequests: number;
    bytesTransferred: number;
  };
  clipboardContent?: string;
  clipboardAction?: string;
}

export interface SystemInformation {
  hardware: {
    platform: string;
    userAgent: string;
    language: string;
    timezone: string;
    screenResolution: string;
    colorDepth: number;
    pixelRatio: number;
  };
  browser: {
    name: string;
    version: string;
    cookiesEnabled: boolean;
    javaScriptEnabled: boolean;
    plugins: string[];
  };
  network: {
    online: boolean;
    connectionType: string;
    effectiveType: string;
  };
  performance: {
    memoryUsage: number;
    cpuUsage: number;
    pageLoadTime: number;
  };
}

export interface EvidenceCollectionConfig {
  screenshotEnabled: boolean;
  screenshotOptions: ScreenshotOptions;
  behaviorTrackingEnabled: boolean;
  behaviorSnapshotInterval: number; // milliseconds
  systemInfoEnabled: boolean;
  networkMonitoringEnabled: boolean;
  clipboardTrackingEnabled: boolean;
  storageEncryptionEnabled: boolean;
  evidenceRetentionDays: number;
  maxEvidencePerViolation: number;
  compressionEnabled: boolean;
}

export interface EvidencePackage {
  id: string;
  violationId: string;
  timestamp: number;
  evidence: ViolationEvidence[];
  integrityHash: string;
  metadata: {
    collectionMethod: string;
    collectorVersion: string;
    environment: string;
  };
}

class EvidenceCollectionService {
  private static instance: EvidenceCollectionService;
  private config: EvidenceCollectionConfig;
  private evidenceStorage: Map<string, EvidencePackage[]> = new Map();
  private behaviorSnapshots: Map<string, BehaviorSnapshot[]> = new Map();
  private collectionIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  private defaultConfig: EvidenceCollectionConfig = {
    screenshotEnabled: true,
    screenshotOptions: {
      quality: 0.8,
      format: 'png',
      maxWidth: 1920,
      maxHeight: 1080,
      includeCursor: false
    },
    behaviorTrackingEnabled: true,
    behaviorSnapshotInterval: 1000, // 1 second
    systemInfoEnabled: true,
    networkMonitoringEnabled: true,
    clipboardTrackingEnabled: true,
    storageEncryptionEnabled: true,
    evidenceRetentionDays: 30,
    maxEvidencePerViolation: 10,
    compressionEnabled: true
  };

  static getInstance(): EvidenceCollectionService {
    if (!EvidenceCollectionService.instance) {
      EvidenceCollectionService.instance = new EvidenceCollectionService();
    }
    return EvidenceCollectionService.instance;
  }

  constructor() {
    this.config = { ...this.defaultConfig };
  }

  /**
   * Initialize the evidence collection service
   */
  initialize(): void {
    if (this.isInitialized) return;

    if (typeof window === 'undefined') {
      console.warn('EvidenceCollectionService: Window not available, running in server mode');
      return;
    }

    // Set up global event listeners
    this.setupGlobalEventListeners();

    // Start evidence cleanup
    this.startEvidenceCleanup();

    this.isInitialized = true;

    auditLogger.logExamSecurity('exam_started', {
      examId: 'system',
      userId: 'system',
      sessionId: 'system',
      severity: 'low',
      description: 'Evidence collection service initialized',
      metadata: { config: this.config }
    });
  }

  /**
   * Set up global event listeners for evidence collection
   */
  private setupGlobalEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Mouse movement tracking
    let mouseThrottleTimer: NodeJS.Timeout | null = null;
    const handleMouseMove = (e: MouseEvent) => {
      if (mouseThrottleTimer) return;

      mouseThrottleTimer = setTimeout(() => {
        this.recordMouseMovement(e.clientX, e.clientY);
        mouseThrottleTimer = null;
      }, 50); // Throttle to 20fps
    };

    // Scroll tracking
    let scrollThrottleTimer: NodeJS.Timeout | null = null;
    const handleScroll = () => {
      if (scrollThrottleTimer) return;

      scrollThrottleTimer = setTimeout(() => {
        this.recordScrollPosition(window.scrollX, window.scrollY);
        scrollThrottleTimer = null;
      }, 100);
    };

    // Keyboard tracking
    const pressedKeys = new Set<string>();
    const handleKeyDown = (e: KeyboardEvent) => {
      pressedKeys.add(e.key);
      this.recordKeyboardState(Array.from(pressedKeys));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.key);
      this.recordKeyboardState(Array.from(pressedKeys));
    };

    // Window focus/blur
    const handleWindowFocus = () => this.recordWindowState(true);
    const handleWindowBlur = () => this.recordWindowState(false);

    // Network monitoring
    this.setupNetworkMonitoring();

    // Clipboard monitoring
    if (this.config.clipboardTrackingEnabled) {
      this.setupClipboardMonitoring();
    }

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);

    // Store cleanup function
    this.cleanupListeners = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }

  private cleanupListeners: (() => void) | null = null;

  /**
   * Set up network monitoring
   */
  private setupNetworkMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monkey patch XMLHttpRequest for network monitoring
    const originalXMLHttpRequest = window.XMLHttpRequest;
    let activeRequests = 0;
    let bytesTransferred = 0;

    const self = this;

    window.XMLHttpRequest = function(this: XMLHttpRequest) {
      const xhr = new originalXMLHttpRequest();

      const originalOpen = xhr.open;
      const originalSend = xhr.send;

      xhr.open = function(method: string, url: string | URL) {
        activeRequests++;
        return originalOpen.apply(this, [method, url] as any);
      };

      xhr.addEventListener('load', () => {
        activeRequests = Math.max(0, activeRequests - 1);
        if (xhr.response) {
          bytesTransferred += xhr.response.length || 0;
        }
        self.recordNetworkActivity(activeRequests, bytesTransferred);
      });

      xhr.addEventListener('error', () => {
        activeRequests = Math.max(0, activeRequests - 1);
        self.recordNetworkActivity(activeRequests, bytesTransferred);
      });

      // Copy all properties
      Object.setPrototypeOf(this, window.XMLHttpRequest.prototype);
      Object.assign(this, xhr);

      return this;
    } as any;

    // Restore prototype chain
    window.XMLHttpRequest.prototype = originalXMLHttpRequest.prototype;

    // Monkey patch fetch
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      activeRequests++;
      try {
        const response = await originalFetch(input, init);
        activeRequests = Math.max(0, activeRequests - 1);

        if (response.body) {
          const reader = response.body.getReader();
          let receivedLength = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            receivedLength += value.length;
          }
          bytesTransferred += receivedLength;
        }

        self.recordNetworkActivity(activeRequests, bytesTransferred);
        return response;
      } catch (error) {
        activeRequests = Math.max(0, activeRequests - 1);
        self.recordNetworkActivity(activeRequests, bytesTransferred);
        throw error;
      }
    };
  }

  /**
   * Set up clipboard monitoring
   */
  private setupClipboardMonitoring(): void {
    if (typeof window === 'undefined' || !navigator.clipboard) return;

    const handleClipboardEvent = async (event: ClipboardEvent) => {
      try {
        const clipboardData = await navigator.clipboard.readText();
        this.recordClipboardContent(clipboardData, event.type);
      } catch (error) {
        console.warn('Failed to read clipboard:', error);
      }
    };

    document.addEventListener('copy', handleClipboardEvent);
    document.addEventListener('paste', handleClipboardEvent);
    document.addEventListener('cut', handleClipboardEvent);
  }

  /**
   * Collect evidence for a security violation
   */
  async collectViolationEvidence(
    violation: ExamSecurityEvent,
    sessionId: string
  ): Promise<ViolationEvidence[]> {
    const evidence: ViolationEvidence[] = [];

    try {
      // Collect screenshot
      if (this.config.screenshotEnabled) {
        const screenshot = await this.captureScreenshot();
        if (screenshot) {
          evidence.push({
            id: this.generateEvidenceId(),
            violationId: violation.id,
            type: 'screenshot',
            timestamp: Date.now(),
            data: screenshot,
            metadata: {
              violationType: violation.eventType,
              quality: this.config.screenshotOptions.quality,
              format: this.config.screenshotOptions.format
            }
          });
        }
      }

      // Collect behavior snapshot
      if (this.config.behaviorTrackingEnabled) {
        const behaviorSnapshot = this.getCurrentBehaviorSnapshot();
        if (behaviorSnapshot) {
          evidence.push({
            id: this.generateEvidenceId(),
            violationId: violation.id,
            type: 'behavior_data',
            timestamp: Date.now(),
            data: behaviorSnapshot,
            metadata: {
              snapshotInterval: this.config.behaviorSnapshotInterval,
              trackingEnabled: true
            }
          });
        }
      }

      // Collect system information
      if (this.config.systemInfoEnabled) {
        const systemInfo = await this.collectSystemInformation();
        evidence.push({
          id: this.generateEvidenceId(),
          violationId: violation.id,
          type: 'system_info',
          timestamp: Date.now(),
          data: systemInfo,
          metadata: {
            collectionMethod: 'comprehensive',
            reliability: 'high'
          }
        });
      }

      // Collect recent behavior snapshots
      const recentSnapshots = this.getRecentBehaviorSnapshots(sessionId, 10);
      if (recentSnapshots.length > 0) {
        evidence.push({
          id: this.generateEvidenceId(),
          violationId: violation.id,
          type: 'behavior_data',
          timestamp: Date.now(),
          data: recentSnapshots,
          metadata: {
            timeRange: 'recent',
            count: recentSnapshots.length
          }
        });
      }

      // Collect network activity data
      if (this.config.networkMonitoringEnabled) {
        const networkData = this.getNetworkActivityData();
        if (networkData) {
          evidence.push({
            id: this.generateEvidenceId(),
            violationId: violation.id,
            type: 'network_log',
            timestamp: Date.now(),
            data: networkData,
            metadata: {
              monitoringEnabled: true,
              dataPoints: Object.keys(networkData).length
            }
          });
        }
      }

      // Limit evidence count
      if (evidence.length > this.config.maxEvidencePerViolation) {
        evidence.splice(this.config.maxEvidencePerViolation);
      }

      // Create evidence package
      const evidencePackage: EvidencePackage = {
        id: this.generatePackageId(),
        violationId: violation.id,
        timestamp: Date.now(),
        evidence,
        integrityHash: await this.generateIntegrityHash(evidence),
        metadata: {
          collectionMethod: 'automated',
          collectorVersion: '1.0.0',
          environment: typeof window !== 'undefined' ? 'browser' : 'server'
        }
      };

      // Store evidence package
      const sessionEvidence = this.evidenceStorage.get(sessionId) || [];
      sessionEvidence.push(evidencePackage);
      this.evidenceStorage.set(sessionId, sessionEvidence);

      // Log evidence collection
      auditLogger.logExamSecurity('tab_switch', {
        examId: violation.examId,
        userId: violation.userId,
        sessionId: violation.sessionId,
        severity: 'low',
        description: `Evidence collected for violation: ${violation.eventType}`,
        metadata: {
          evidenceCount: evidence.length,
          evidenceTypes: evidence.map(e => e.type),
          packageId: evidencePackage.id
        }
      });

    } catch (error) {
      console.error('Error collecting violation evidence:', error);

      // Log collection failure
      auditLogger.logExamSecurity('copy_paste', {
        examId: violation.examId,
        userId: violation.userId,
        sessionId: violation.sessionId,
        severity: 'medium',
        description: 'Failed to collect evidence for violation',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          violationType: violation.eventType
        }
      });
    }

    return evidence;
  }

  /**
   * Capture screenshot
   */
  private async captureScreenshot(): Promise<string | null> {
    try {
      // Check if html2canvas is available (would need to be installed)
      if (typeof window === 'undefined' || !(window as any).html2canvas) {
        // Fallback: create a simple canvas representation
        return this.createFallbackScreenshot();
      }

      const canvas = await (window as any).html2canvas(document.body, {
        allowTaint: false,
        useCORS: true,
        scale: this.config.screenshotOptions.quality || 0.8,
        width: this.config.screenshotOptions.maxWidth,
        height: this.config.screenshotOptions.maxHeight,
        backgroundColor: '#ffffff'
      });

      return canvas.toDataURL(
        `image/${this.config.screenshotOptions.format || 'png'}`,
        this.config.screenshotOptions.quality || 0.8
      );

    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return this.createFallbackScreenshot();
    }
  }

  /**
   * Create fallback screenshot when html2canvas is not available
   */
  private createFallbackScreenshot(): string {
    try {
      const canvas = document.createElement('canvas');
      let ctx: CanvasRenderingContext2D | null = null;
      try {
        ctx = canvas.getContext && canvas.getContext('2d');
      } catch {
        ctx = null;
      }

      if (!ctx) return '';

      // Set canvas size
      canvas.width = Math.min(window.innerWidth, this.config.screenshotOptions.maxWidth || 1920);
      canvas.height = Math.min(window.innerHeight, this.config.screenshotOptions.maxHeight || 1080);

      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add timestamp
      ctx.fillStyle = '#000000';
      ctx.font = '16px Arial';
      ctx.fillText(`Screenshot taken at ${new Date().toISOString()}`, 10, 30);
      ctx.fillText(`Resolution: ${canvas.width}x${canvas.height}`, 10, 60);
      ctx.fillText(`User Agent: ${navigator.userAgent.substring(0, 100)}`, 10, 90);

      return canvas.toDataURL(`image/${this.config.screenshotOptions.format || 'png'}`);
    } catch (error) {
      console.error('Fallback screenshot creation failed:', error);
      return '';
    }
  }

  /**
   * Collect comprehensive system information
   */
  private async collectSystemInformation(): Promise<SystemInformation> {
    const systemInfo: SystemInformation = {
      hardware: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio
      },
      browser: {
        name: this.detectBrowserName(),
        version: this.detectBrowserVersion(),
        cookiesEnabled: navigator.cookieEnabled,
        javaScriptEnabled: true, // If this code runs, JS is enabled
        plugins: this.getBrowserPlugins()
      },
      network: {
        online: navigator.onLine,
        connectionType: (navigator as any).connection?.type || 'unknown',
        effectiveType: (navigator as any).connection?.effectiveType || 'unknown'
      },
      performance: {
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        cpuUsage: 0, // Would need additional libraries to measure
        pageLoadTime: performance.timing.loadEventEnd - performance.timing.navigationStart
      }
    };

    return systemInfo;
  }

  /**
   * Detect browser name
   */
  private detectBrowserName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  /**
   * Detect browser version
   */
  private detectBrowserVersion(): string {
    const ua = navigator.userAgent;
    const browser = this.detectBrowserName();

    switch (browser) {
      case 'Chrome':
        const chromeMatch = ua.match(/Chrome\/(\d+)/);
        return chromeMatch ? chromeMatch[1] : 'Unknown';
      case 'Firefox':
        const firefoxMatch = ua.match(/Firefox\/(\d+)/);
        return firefoxMatch ? firefoxMatch[1] : 'Unknown';
      case 'Safari':
        const safariMatch = ua.match(/Version\/(\d+)/);
        return safariMatch ? safariMatch[1] : 'Unknown';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get browser plugins
   */
  private getBrowserPlugins(): string[] {
    if (!navigator.plugins) return [];

    const plugins: string[] = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      plugins.push(navigator.plugins[i].name);
    }
    return plugins;
  }

  /**
   * Record mouse movement
   */
  private recordMouseMovement(x: number, y: number): void {
    // This would be stored in a buffer and used when collecting evidence
    // For now, we'll just update the current snapshot
    this.updateBehaviorSnapshot({
      mousePosition: { x, y }
    });
  }

  /**
   * Record scroll position
   */
  private recordScrollPosition(x: number, y: number): void {
    this.updateBehaviorSnapshot({
      scrollPosition: { x, y }
    });
  }

  /**
   * Record keyboard state
   */
  private recordKeyboardState(pressedKeys: string[]): void {
    this.updateBehaviorSnapshot({
      keyboardState: { pressedKeys }
    });
  }

  /**
   * Record window state
   */
  private recordWindowState(focused: boolean): void {
    this.updateBehaviorSnapshot({
      windowState: {
        focused,
        minimized: !focused,
        size: { width: window.innerWidth, height: window.innerHeight }
      }
    });
  }

  /**
   * Record network activity
   */
  private recordNetworkActivity(activeRequests: number, bytesTransferred: number): void {
    this.updateBehaviorSnapshot({
      networkActivity: { activeRequests, bytesTransferred }
    });
  }

  /**
   * Record clipboard content
   */
  private recordClipboardContent(content: string, action: string): void {
    // Store clipboard data for evidence collection
    this.updateBehaviorSnapshot({
      clipboardContent: content,
      clipboardAction: action
    });
  }

  /**
   * Update behavior snapshot
   */
  private updateBehaviorSnapshot(updates: Partial<BehaviorSnapshot>): void {
    const sessionId = 'global'; // In a real implementation, this would be per-session
    let snapshots = this.behaviorSnapshots.get(sessionId) || [];

    const currentSnapshot: BehaviorSnapshot = {
      timestamp: Date.now(),
      mousePosition: updates.mousePosition || { x: 0, y: 0 },
      scrollPosition: updates.scrollPosition || { x: window.scrollX, y: window.scrollY },
      activeElement: (document.activeElement as HTMLElement)?.tagName || 'none',
      keyboardState: updates.keyboardState || { pressedKeys: [] },
      windowState: updates.windowState || {
        focused: document.hasFocus(),
        minimized: false,
        size: { width: window.innerWidth, height: window.innerHeight }
      },
      networkActivity: updates.networkActivity || { activeRequests: 0, bytesTransferred: 0 },
      ...updates
    };

    // Keep only recent snapshots (last 100)
    snapshots.push(currentSnapshot);
    if (snapshots.length > 100) {
      snapshots = snapshots.slice(-100);
    }

    this.behaviorSnapshots.set(sessionId, snapshots);
  }

  /**
   * Get current behavior snapshot
   */
  private getCurrentBehaviorSnapshot(): BehaviorSnapshot | null {
    const sessionId = 'global';
    const snapshots = this.behaviorSnapshots.get(sessionId) || [];
    return snapshots[snapshots.length - 1] || null;
  }

  /**
   * Get recent behavior snapshots
   */
  private getRecentBehaviorSnapshots(sessionId: string, count: number): BehaviorSnapshot[] {
    const snapshots = this.behaviorSnapshots.get(sessionId) || [];
    return snapshots.slice(-count);
  }

  /**
   * Get network activity data
   */
  private getNetworkActivityData(): any {
    // This would aggregate network activity data
    return {
      timestamp: Date.now(),
      activeConnections: 0,
      totalBytesTransferred: 0,
      failedRequests: 0
    };
  }

  /**
   * Generate integrity hash for evidence
   */
  private async generateIntegrityHash(evidence: ViolationEvidence[]): Promise<string> {
    try {
      const evidenceString = JSON.stringify(evidence);
      const encoder = new TextEncoder();
      const data = encoder.encode(evidenceString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Failed to generate integrity hash:', error);
      return 'hash_generation_failed';
    }
  }

  /**
   * Start behavior tracking for a session
   */
  startSessionTracking(sessionId: string): void {
    if (this.collectionIntervals.has(sessionId)) return;

    const interval = setInterval(() => {
      // Periodic behavior snapshot
      this.updateBehaviorSnapshot({});
    }, this.config.behaviorSnapshotInterval);

    this.collectionIntervals.set(sessionId, interval);
  }

  /**
   * Stop behavior tracking for a session
   */
  stopSessionTracking(sessionId: string): void {
    const interval = this.collectionIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.collectionIntervals.delete(sessionId);
    }

    // Clean up behavior snapshots
    this.behaviorSnapshots.delete(sessionId);
  }

  /**
   * Get evidence packages for a session
   */
  getEvidencePackages(sessionId: string): EvidencePackage[] {
    return this.evidenceStorage.get(sessionId) || [];
  }

  /**
   * Verify evidence integrity
   */
  async verifyEvidenceIntegrity(evidencePackage: EvidencePackage): Promise<boolean> {
    try {
      const currentHash = await this.generateIntegrityHash(evidencePackage.evidence);
      return currentHash === evidencePackage.integrityHash;
    } catch (error) {
      console.error('Evidence integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Start evidence cleanup
   */
  private startEvidenceCleanup(): void {
    setInterval(() => {
      this.cleanupOldEvidence();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Clean up old evidence
   */
  private cleanupOldEvidence(): void {
    const cutoffTime = Date.now() - (this.config.evidenceRetentionDays * 24 * 60 * 60 * 1000);

    // Clean up evidence packages
    for (const [sessionId, packages] of this.evidenceStorage.entries()) {
      const filteredPackages = packages.filter(pkg => pkg.timestamp > cutoffTime);
      if (filteredPackages.length === 0) {
        this.evidenceStorage.delete(sessionId);
      } else {
        this.evidenceStorage.set(sessionId, filteredPackages);
      }
    }

    // Clean up old behavior snapshots
    for (const [sessionId, snapshots] of this.behaviorSnapshots.entries()) {
      const filteredSnapshots = snapshots.filter(snapshot => snapshot.timestamp > cutoffTime);
      if (filteredSnapshots.length === 0) {
        this.behaviorSnapshots.delete(sessionId);
      } else {
        this.behaviorSnapshots.set(sessionId, filteredSnapshots);
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EvidenceCollectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): EvidenceCollectionConfig {
    return { ...this.config };
  }

  /**
   * Generate unique IDs
   */
  private generateEvidenceId(): string {
    return 'evidence_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generatePackageId(): string {
    return 'package_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Export evidence data
   */
  exportEvidenceData(sessionId: string, format: 'json' | 'csv' = 'json'): any {
    const packages = this.getEvidencePackages(sessionId);
    const snapshots = this.behaviorSnapshots.get(sessionId) || [];

    const exportData = {
      sessionId,
      evidencePackages: packages,
      behaviorSnapshots: snapshots,
      exportTimestamp: Date.now(),
      format
    };

    if (format === 'csv') {
      // Convert to CSV format
      return this.convertToCSV(exportData);
    }

    return exportData;
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    // This would implement CSV conversion logic
    // For now, return JSON string
    return JSON.stringify(data, null, 2);
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    // Clear all intervals
    for (const interval of this.collectionIntervals.values()) {
      clearInterval(interval);
    }
    this.collectionIntervals.clear();

    // Clean up event listeners
    if (this.cleanupListeners) {
      this.cleanupListeners();
      this.cleanupListeners = null;
    }

    // Clear all data
    this.evidenceStorage.clear();
    this.behaviorSnapshots.clear();

    this.isInitialized = false;
  }
}

export const evidenceCollectionService = EvidenceCollectionService.getInstance();
export default evidenceCollectionService;
