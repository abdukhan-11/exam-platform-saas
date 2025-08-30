/**
 * Browser Compatibility Layer
 *
 * Comprehensive browser detection, feature detection, and compatibility
 * management system for cross-platform exam interface support.
 */

import { auditLogger } from './audit-logger';

export interface BrowserInfo {
  name: 'Chrome' | 'Firefox' | 'Safari' | 'Edge' | 'Opera' | 'Unknown';
  version: string;
  engine: 'Blink' | 'Gecko' | 'WebKit' | 'Trident' | 'Unknown';
  platform: string;
  mobile: boolean;
  tablet: boolean;
  touchSupport: boolean;
  cookieSupport: boolean;
  localStorageSupport: boolean;
  sessionStorageSupport: boolean;
  indexedDBSupport: boolean;
  webGLSupport: boolean;
  canvasSupport: boolean;
  webAudioSupport: boolean;
  webRTCSupport: boolean;
  fullscreenSupport: boolean;
  geolocationSupport: boolean;
  notificationSupport: boolean;
  serviceWorkerSupport: boolean;
  webAssemblySupport: boolean;
}

export interface FeatureSupport {
  required: string[];
  recommended: string[];
  optional: string[];
  unsupported: string[];
  warnings: string[];
}

export interface BrowserCompatibilityConfig {
  strictMode: boolean;
  allowFallbacks: boolean;
  enablePolyfills: boolean;
  performanceMonitoring: boolean;
  compatibilityReporting: boolean;
}

export class BrowserCompatibilityManager {
  private config: BrowserCompatibilityConfig;
  private browserInfo: BrowserInfo;
  private featureSupport: FeatureSupport;
  private compatibilityScore: number;
  private isInitialized = false;

  constructor(config: Partial<BrowserCompatibilityConfig> = {}) {
    this.config = {
      strictMode: false,
      allowFallbacks: true,
      enablePolyfills: true,
      performanceMonitoring: true,
      compatibilityReporting: true,
      ...config
    };

    this.browserInfo = this.detectBrowser();
    this.featureSupport = this.detectFeatures();
    this.compatibilityScore = this.calculateCompatibilityScore();
  }

  /**
   * Initialize the browser compatibility manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load polyfills if needed
      if (this.config.enablePolyfills) {
        await this.loadPolyfills();
      }

      // Set up compatibility monitoring
      this.setupCompatibilityMonitoring();

      // Report compatibility status
      if (this.config.compatibilityReporting) {
        this.reportCompatibilityStatus();
      }

      this.isInitialized = true;

      auditLogger.logExamSecurity('exam_started', {
        examId: 'system',
        userId: 'system',
        sessionId: 'system',
        severity: 'low',
        description: 'Browser compatibility manager initialized',
        metadata: {
          browser: this.browserInfo.name,
          version: this.browserInfo.version,
          compatibilityScore: this.compatibilityScore,
          requiredFeaturesSupported: this.featureSupport.required.length === 0
        }
      });
    } catch (error) {
      console.error('Failed to initialize browser compatibility manager:', error);
      throw error;
    }
  }

  /**
   * Get browser information
   */
  getBrowserInfo(): BrowserInfo {
    return { ...this.browserInfo };
  }

  /**
   * Get feature support information
   */
  getFeatureSupport(): FeatureSupport {
    return { ...this.featureSupport };
  }

  /**
   * Get compatibility score (0-100)
   */
  getCompatibilityScore(): number {
    return this.compatibilityScore;
  }

  /**
   * Check if browser meets minimum requirements
   */
  isCompatible(): boolean {
    return this.featureSupport.required.length === 0;
  }

  /**
   * Check if specific feature is supported
   */
  isFeatureSupported(feature: keyof BrowserInfo): boolean {
    return Boolean(this.browserInfo[feature]);
  }

  /**
   * Get compatibility warnings
   */
  getCompatibilityWarnings(): string[] {
    return [
      ...this.featureSupport.warnings,
      ...this.getBrowserVersionWarnings(),
      ...this.getPlatformWarnings()
    ];
  }

  /**
   * Get recommended browser settings
   */
  getRecommendedSettings(): Record<string, any> {
    const settings: Record<string, any> = {
      enableHardwareAcceleration: true,
      disableExtensions: false,
      enableJavaScript: true,
      enableCookies: true,
      enableLocalStorage: true,
      enableFullscreen: true,
      minimumResolution: '1024x768'
    };

    // Browser-specific recommendations
    switch (this.browserInfo.name) {
      case 'Chrome':
        settings.preferredVersion = '90+';
        break;
      case 'Firefox':
        settings.preferredVersion = '88+';
        break;
      case 'Safari':
        settings.preferredVersion = '14+';
        break;
      case 'Edge':
        settings.preferredVersion = '90+';
        break;
    }

    return settings;
  }

  /**
   * Detect browser information
   */
  private detectBrowser(): BrowserInfo {
    const ua = navigator.userAgent;
    const platform = navigator.platform;

    // Detect browser name and version
    let name: BrowserInfo['name'] = 'Unknown';
    let version = '0.0';
    let engine: BrowserInfo['engine'] = 'Unknown';

    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      name = 'Chrome';
      const match = ua.match(/Chrome\/(\d+)/);
      version = match ? match[1] : '0.0';
      engine = 'Blink';
    } else if (ua.includes('Firefox')) {
      name = 'Firefox';
      const match = ua.match(/Firefox\/(\d+)/);
      version = match ? match[1] : '0.0';
      engine = 'Gecko';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      name = 'Safari';
      const match = ua.match(/Version\/(\d+)/);
      version = match ? match[1] : '0.0';
      engine = 'WebKit';
    } else if (ua.includes('Edg')) {
      name = 'Edge';
      const match = ua.match(/Edg\/(\d+)/);
      version = match ? match[1] : '0.0';
      engine = 'Blink';
    } else if (ua.includes('Opera')) {
      name = 'Opera';
      const match = ua.match(/Opera\/(\d+)/);
      version = match ? match[1] : '0.0';
      engine = 'Blink';
    }

    // Detect mobile/tablet
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const tablet = /iPad|Android(?=.*Tablet)|Tablet/i.test(ua);

    return {
      name,
      version,
      engine,
      platform,
      mobile,
      tablet,
      touchSupport: 'ontouchstart' in window,
      cookieSupport: navigator.cookieEnabled,
      localStorageSupport: this.checkLocalStorageSupport(),
      sessionStorageSupport: this.checkSessionStorageSupport(),
      indexedDBSupport: this.checkIndexedDBSupport(),
      webGLSupport: this.checkWebGLSupport(),
      canvasSupport: this.checkCanvasSupport(),
      webAudioSupport: this.checkWebAudioSupport(),
      webRTCSupport: this.checkWebRTCSupport(),
      fullscreenSupport: this.checkFullscreenSupport(),
      geolocationSupport: 'geolocation' in navigator,
      notificationSupport: 'Notification' in window,
      serviceWorkerSupport: 'serviceWorker' in navigator,
      webAssemblySupport: typeof WebAssembly !== 'undefined'
    };
  }

  /**
   * Detect feature support
   */
  private detectFeatures(): FeatureSupport {
    const required: string[] = [];
    const recommended: string[] = [];
    const optional: string[] = [];
    const unsupported: string[] = [];
    const warnings: string[] = [];

    // Check required features for exam system
    if (!this.browserInfo.canvasSupport) {
      required.push('Canvas API');
    }

    if (!this.browserInfo.localStorageSupport) {
      required.push('Local Storage');
    }

    if (!this.browserInfo.fullscreenSupport) {
      required.push('Fullscreen API');
    }

    // Check recommended features
    if (!this.browserInfo.webGLSupport) {
      recommended.push('WebGL');
      warnings.push('WebGL not supported - some visual features may be limited');
    }

    if (!this.browserInfo.webRTCSupport) {
      recommended.push('WebRTC');
    }

    if (!this.browserInfo.serviceWorkerSupport) {
      recommended.push('Service Workers');
    }

    // Check optional features
    if (!this.browserInfo.notificationSupport) {
      optional.push('Notifications');
    }

    if (!this.browserInfo.geolocationSupport) {
      optional.push('Geolocation');
    }

    // Check for known compatibility issues
    if (this.browserInfo.name === 'Safari' && parseInt(this.browserInfo.version) < 14) {
      warnings.push('Safari version may have limited WebGL support');
    }

    if (this.browserInfo.mobile && !this.browserInfo.tablet) {
      warnings.push('Mobile devices may have limited fullscreen capabilities');
    }

    return {
      required,
      recommended,
      optional,
      unsupported,
      warnings
    };
  }

  /**
   * Calculate compatibility score
   */
  private calculateCompatibilityScore(): number {
    let score = 100;

    // Deduct points for missing required features
    score -= this.featureSupport.required.length * 25;

    // Deduct points for missing recommended features
    score -= this.featureSupport.recommended.length * 10;

    // Deduct points for browser version
    const versionWarnings = this.getBrowserVersionWarnings();
    score -= versionWarnings.length * 5;

    // Deduct points for platform issues
    const platformWarnings = this.getPlatformWarnings();
    score -= platformWarnings.length * 5;

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get browser version warnings
   */
  private getBrowserVersionWarnings(): string[] {
    const warnings: string[] = [];
    const version = parseInt(this.browserInfo.version);

    switch (this.browserInfo.name) {
      case 'Chrome':
        if (version < 90) {
          warnings.push('Chrome version may have compatibility issues');
        }
        break;
      case 'Firefox':
        if (version < 88) {
          warnings.push('Firefox version may have compatibility issues');
        }
        break;
      case 'Safari':
        if (version < 14) {
          warnings.push('Safari version has known compatibility issues');
        }
        break;
      case 'Edge':
        if (version < 90) {
          warnings.push('Edge version may have compatibility issues');
        }
        break;
    }

    return warnings;
  }

  /**
   * Get platform warnings
   */
  private getPlatformWarnings(): string[] {
    const warnings: string[] = [];

    if (this.browserInfo.mobile && !this.browserInfo.tablet) {
      warnings.push('Mobile phone detected - some features may be limited');
    }

    if (/Windows NT 6\.[01]/.test(navigator.userAgent)) {
      warnings.push('Older Windows version detected');
    }

    return warnings;
  }

  /**
   * Check local storage support
   */
  private checkLocalStorageSupport(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check session storage support
   */
  private checkSessionStorageSupport(): boolean {
    try {
      const test = '__storage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check IndexedDB support
   */
  private checkIndexedDBSupport(): boolean {
    return 'indexedDB' in window;
  }

  /**
   * Check WebGL support
   */
  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  /**
   * Check Canvas support
   */
  private checkCanvasSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    } catch {
      return false;
    }
  }

  /**
   * Check Web Audio support
   */
  private checkWebAudioSupport(): boolean {
    return 'AudioContext' in window || 'webkitAudioContext' in window;
  }

  /**
   * Check WebRTC support
   */
  private checkWebRTCSupport(): boolean {
    return 'RTCPeerConnection' in window || 'webkitRTCPeerConnection' in window;
  }

  /**
   * Check fullscreen support
   */
  private checkFullscreenSupport(): boolean {
    const doc = document as any;
    return !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled || doc.mozFullScreenEnabled || doc.msFullscreenEnabled);
  }

  /**
   * Load polyfills for missing features
   */
  private async loadPolyfills(): Promise<void> {
    // Load polyfills for missing features
    if (!this.browserInfo.canvasSupport) {
      console.warn('Canvas not supported - exam interface may not function properly');
    }

    if (!this.browserInfo.localStorageSupport) {
      console.warn('LocalStorage not supported - using fallback storage');
      // Could load a polyfill for localStorage
    }

    // Additional polyfills can be loaded here as needed
  }

  /**
   * Set up compatibility monitoring
   */
  private setupCompatibilityMonitoring(): void {
    // Monitor for browser compatibility issues during exam
    window.addEventListener('error', (event) => {
      if (this.isCompatibilityRelatedError(event.message)) {
        auditLogger.logExamSecurity('copy_paste', {
          examId: 'system',
          userId: 'system',
          sessionId: 'system',
          severity: 'medium',
          description: 'Browser compatibility error detected',
          metadata: {
            error: event.message,
            browser: this.browserInfo.name,
            version: this.browserInfo.version
          }
        });
      }
    });
  }

  /**
   * Check if error is compatibility-related
   */
  private isCompatibilityRelatedError(message: string): boolean {
    const compatibilityKeywords = [
      'not supported',
      'undefined is not a function',
      'cannot read property',
      'webgl',
      'canvas',
      'fullscreen',
      'localStorage',
      'sessionStorage'
    ];

    return compatibilityKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    );
  }

  /**
   * Report compatibility status
   */
  private reportCompatibilityStatus(): void {
    const report = {
      browser: this.browserInfo,
      featureSupport: this.featureSupport,
      compatibilityScore: this.compatibilityScore,
      warnings: this.getCompatibilityWarnings(),
      recommendedSettings: this.getRecommendedSettings()
    };

    console.log('Browser Compatibility Report:', report);

    auditLogger.logExamSecurity('copy_paste', {
      examId: 'system',
      userId: 'system',
      sessionId: 'system',
      severity: 'low',
      description: 'Browser compatibility assessment completed',
      metadata: {
        browser: this.browserInfo.name,
        version: this.browserInfo.version,
        compatibilityScore: this.compatibilityScore,
        requiredFeaturesMissing: this.featureSupport.required.length
      }
    });
  }
}

// Export singleton instance
export const browserCompatibilityManager = new BrowserCompatibilityManager();
