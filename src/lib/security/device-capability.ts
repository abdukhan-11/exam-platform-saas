/**
 * Device Capability Detection System
 *
 * Comprehensive device capability assessment for optimizing exam interface
 * performance and features based on hardware and software capabilities.
 */

import { auditLogger } from './audit-logger';

export interface HardwareCapabilities {
  cpu: {
    cores: number;
    architecture: string;
    frequency: number; // MHz
    vendor: string;
  };
  memory: {
    total: number; // MB
    available: number; // MB
    type: string;
  };
  storage: {
    type: 'hdd' | 'ssd' | 'flash';
    size: number; // GB
    readSpeed: number; // MB/s
    writeSpeed: number; // MB/s
  };
  gpu: {
    vendor: string;
    model: string;
    vram: number; // MB
    supportsWebGL: boolean;
    supportsWebGL2: boolean;
    maxTextureSize: number;
    maxRenderbufferSize: number;
  };
}

export interface SoftwareCapabilities {
  browser: {
    name: string;
    version: string;
    engine: string;
    userAgent: string;
  };
  os: {
    name: string;
    version: string;
    architecture: string;
  };
  network: {
    type: 'ethernet' | 'wifi' | 'cellular' | 'unknown';
    speed: 'slow' | 'medium' | 'fast';
    latency: number; // ms
  };
  battery: {
    supported: boolean;
    level: number; // 0-100
    charging: boolean;
  };
}

export interface PerformanceProfile {
  category: 'low-end' | 'mid-range' | 'high-end' | 'server-grade';
  score: number; // 0-100
  capabilities: string[];
  limitations: string[];
  recommendedFeatures: string[];
  disabledFeatures: string[];
}

export interface DeviceCapabilityConfig {
  enableHardwareDetection: boolean;
  enableSoftwareDetection: boolean;
  enablePerformanceProfiling: boolean;
  cacheResults: boolean;
  cacheDuration: number; // milliseconds
}

export class DeviceCapabilityDetector {
  private config: DeviceCapabilityConfig;
  private hardwareCapabilities: HardwareCapabilities;
  private softwareCapabilities: SoftwareCapabilities;
  private performanceProfile: PerformanceProfile;
  private detectionCache: Map<string, any> = new Map();
  private isInitialized = false;

  constructor(config: Partial<DeviceCapabilityConfig> = {}) {
    this.config = {
      enableHardwareDetection: true,
      enableSoftwareDetection: true,
      enablePerformanceProfiling: true,
      cacheResults: true,
      cacheDuration: 3600000, // 1 hour
      ...config
    };

    this.hardwareCapabilities = this.detectHardwareCapabilities();
    this.softwareCapabilities = this.detectSoftwareCapabilities();
    this.performanceProfile = this.createPerformanceProfile();
  }

  /**
   * Initialize the device capability detector
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load cached results if enabled
      if (this.config.cacheResults) {
        await this.loadCachedResults();
      }

      // Perform comprehensive detection
      if (this.config.enableHardwareDetection) {
        this.hardwareCapabilities = await this.enhancedHardwareDetection();
      }

      if (this.config.enableSoftwareDetection) {
        this.softwareCapabilities = await this.enhancedSoftwareDetection();
      }

      if (this.config.enablePerformanceProfiling) {
        this.performanceProfile = await this.createDetailedPerformanceProfile();
      }

      // Cache results
      if (this.config.cacheResults) {
        await this.cacheResults();
      }

      this.isInitialized = true;

      auditLogger.logExamSecurity('exam_started', {
        examId: 'system',
        userId: 'system',
        sessionId: 'system',
        severity: 'low',
        description: 'Device capability detector initialized',
        metadata: {
          performanceCategory: this.performanceProfile.category,
          performanceScore: this.performanceProfile.score,
          hardwareCores: this.hardwareCapabilities.cpu.cores,
          memoryMB: this.hardwareCapabilities.memory.total
        }
      });
    } catch (error) {
      console.error('Failed to initialize device capability detector:', error);
      throw error;
    }
  }

  /**
   * Get hardware capabilities
   */
  getHardwareCapabilities(): HardwareCapabilities {
    return { ...this.hardwareCapabilities };
  }

  /**
   * Get software capabilities
   */
  getSoftwareCapabilities(): SoftwareCapabilities {
    return { ...this.softwareCapabilities };
  }

  /**
   * Get performance profile
   */
  getPerformanceProfile(): PerformanceProfile {
    return { ...this.performanceProfile };
  }

  /**
   * Check if device supports feature
   */
  supportsFeature(feature: string): boolean {
    return this.performanceProfile.capabilities.includes(feature);
  }

  /**
   * Check if feature is disabled for this device
   */
  isFeatureDisabled(feature: string): boolean {
    return this.performanceProfile.disabledFeatures.includes(feature);
  }

  /**
   * Get device capability score
   */
  getCapabilityScore(): number {
    return this.performanceProfile.score;
  }

  /**
   * Get device category
   */
  getDeviceCategory(): PerformanceProfile['category'] {
    return this.performanceProfile.category;
  }

  /**
   * Get recommended settings for exam
   */
  getRecommendedSettings(): {
    maxConcurrentOperations: number;
    enableBackgroundProcessing: boolean;
    enableAdvancedGraphics: boolean;
    enableRealTimeSync: boolean;
    cacheStrategy: 'aggressive' | 'moderate' | 'conservative';
    imageQuality: 'high' | 'medium' | 'low';
    animationLevel: 'full' | 'reduced' | 'disabled';
  } {
    const category = this.performanceProfile.category;

    switch (category) {
      case 'server-grade':
      case 'high-end':
        return {
          maxConcurrentOperations: 10,
          enableBackgroundProcessing: true,
          enableAdvancedGraphics: true,
          enableRealTimeSync: true,
          cacheStrategy: 'aggressive',
          imageQuality: 'high',
          animationLevel: 'full'
        };

      case 'mid-range':
        return {
          maxConcurrentOperations: 5,
          enableBackgroundProcessing: true,
          enableAdvancedGraphics: true,
          enableRealTimeSync: false,
          cacheStrategy: 'moderate',
          imageQuality: 'medium',
          animationLevel: 'reduced'
        };

      case 'low-end':
      default:
        return {
          maxConcurrentOperations: 2,
          enableBackgroundProcessing: false,
          enableAdvancedGraphics: false,
          enableRealTimeSync: false,
          cacheStrategy: 'conservative',
          imageQuality: 'low',
          animationLevel: 'disabled'
        };
    }
  }

  /**
   * Detect hardware capabilities
   */
  private detectHardwareCapabilities(): HardwareCapabilities {
    return {
      cpu: {
        cores: navigator.hardwareConcurrency || 2,
        architecture: this.detectCPUArchitecture(),
        frequency: 0, // Cannot detect reliably in browser
        vendor: this.detectCPUVendor()
      },
      memory: {
        total: (navigator as any).deviceMemory ? (navigator as any).deviceMemory * 1024 : 4096,
        available: 0, // Cannot detect reliably in browser
        type: 'DDR4' // Assumed
      },
      storage: {
        type: 'ssd', // Assumed for modern devices
        size: 0, // Cannot detect reliably in browser
        readSpeed: 0,
        writeSpeed: 0
      },
      gpu: {
        vendor: this.detectGPUVendor(),
        model: this.detectGPUModel(),
        vram: this.detectGPUVRAM(),
        supportsWebGL: this.checkWebGLSupport(),
        supportsWebGL2: this.checkWebGL2Support(),
        maxTextureSize: this.getMaxTextureSize(),
        maxRenderbufferSize: this.getMaxRenderbufferSize()
      }
    };
  }

  /**
   * Detect software capabilities
   */
  private detectSoftwareCapabilities(): SoftwareCapabilities {
    return {
      browser: {
        name: this.detectBrowserName(),
        version: this.detectBrowserVersion(),
        engine: this.detectBrowserEngine(),
        userAgent: navigator.userAgent
      },
      os: {
        name: this.detectOSName(),
        version: this.detectOSVersion(),
        architecture: this.detectOSArchitecture()
      },
      network: {
        type: this.detectNetworkType(),
        speed: this.detectNetworkSpeed(),
        latency: 0 // Would need actual network testing
      },
      battery: {
        supported: 'getBattery' in navigator,
        level: 100, // Default, would be updated if battery API available
        charging: true
      }
    };
  }

  /**
   * Create performance profile
   */
  private createPerformanceProfile(): PerformanceProfile {
    const hw = this.hardwareCapabilities;
    const sw = this.softwareCapabilities;

    let score = 50; // Base score
    const capabilities: string[] = [];
    const limitations: string[] = [];
    const recommendedFeatures: string[] = [];
    const disabledFeatures: string[] = [];

    // CPU scoring
    if (hw.cpu.cores >= 8) {
      score += 20;
      capabilities.push('multi-threading');
    } else if (hw.cpu.cores >= 4) {
      score += 10;
      capabilities.push('multi-core');
    } else {
      limitations.push('limited-cpu-cores');
    }

    // Memory scoring
    if (hw.memory.total >= 8192) { // 8GB+
      score += 20;
      capabilities.push('high-memory');
    } else if (hw.memory.total >= 4096) { // 4GB+
      score += 10;
      capabilities.push('adequate-memory');
    } else {
      score -= 10;
      limitations.push('limited-memory');
    }

    // GPU scoring
    if (hw.gpu.supportsWebGL2) {
      score += 15;
      capabilities.push('advanced-graphics');
      recommendedFeatures.push('webgl-effects');
    } else if (hw.gpu.supportsWebGL) {
      score += 10;
      capabilities.push('basic-graphics');
      recommendedFeatures.push('canvas-effects');
    } else {
      score -= 10;
      limitations.push('no-webgl');
      disabledFeatures.push('advanced-graphics');
    }

    // Network scoring
    if (sw.network.speed === 'fast') {
      score += 10;
      capabilities.push('fast-network');
    } else if (sw.network.speed === 'medium') {
      score += 5;
      capabilities.push('medium-network');
    } else {
      limitations.push('slow-network');
      disabledFeatures.push('real-time-sync');
    }

    // Determine category
    let category: PerformanceProfile['category'];
    if (score >= 80) {
      category = 'high-end';
    } else if (score >= 60) {
      category = 'mid-range';
    } else if (score >= 40) {
      category = 'low-end';
    } else {
      category = 'server-grade'; // Very low score might indicate server environment
    }

    // Add browser-specific capabilities/limitations
    if (sw.browser.name === 'Safari' && parseInt(sw.browser.version) < 14) {
      score -= 5;
      limitations.push('older-safari');
    }

    if (sw.browser.name === 'Internet Explorer') {
      score -= 20;
      limitations.push('unsupported-browser');
      disabledFeatures.push('modern-features');
    }

    return {
      category,
      score: Math.max(0, Math.min(100, score)),
      capabilities,
      limitations,
      recommendedFeatures,
      disabledFeatures
    };
  }

  /**
   * Enhanced hardware detection
   */
  private async enhancedHardwareDetection(): Promise<HardwareCapabilities> {
    const baseCapabilities = this.detectHardwareCapabilities();

    // Attempt to get more detailed information
    try {
      // Test CPU performance
      const cpuPerformance = await this.testCPUPerformance();
      baseCapabilities.cpu.frequency = cpuPerformance.estimatedFrequency;

      // Test memory performance
      const memoryInfo = await this.testMemoryPerformance();
      baseCapabilities.memory.available = memoryInfo.available;

      // Test storage performance
      const storageInfo = await this.testStoragePerformance();
      baseCapabilities.storage = { ...baseCapabilities.storage, ...storageInfo };

    } catch (error) {
      console.warn('Enhanced hardware detection failed:', error);
    }

    return baseCapabilities;
  }

  /**
   * Enhanced software detection
   */
  private async enhancedSoftwareDetection(): Promise<SoftwareCapabilities> {
    const baseCapabilities = this.detectSoftwareCapabilities();

    // Test network performance
    try {
      const networkTest = await this.testNetworkPerformance();
      baseCapabilities.network.latency = networkTest.latency;
    } catch (error) {
      console.warn('Network performance test failed:', error);
    }

    // Get battery information if available
    if (baseCapabilities.battery.supported && 'getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        baseCapabilities.battery.level = battery.level * 100;
        baseCapabilities.battery.charging = battery.charging;
      } catch (error) {
        console.warn('Battery information unavailable:', error);
      }
    }

    return baseCapabilities;
  }

  /**
   * Create detailed performance profile
   */
  private async createDetailedPerformanceProfile(): Promise<PerformanceProfile> {
    const baseProfile = this.createPerformanceProfile();

    // Run performance benchmarks
    try {
      const benchmarkResults = await this.runPerformanceBenchmarks();

      // Adjust score based on benchmarks
      baseProfile.score = Math.max(0, Math.min(100,
        (baseProfile.score + benchmarkResults.adjustment) / 2
      ));

      // Add benchmark-based capabilities
      if (benchmarkResults.jsPerformance > 80) {
        baseProfile.capabilities.push('fast-js-execution');
      }

      if (benchmarkResults.renderPerformance > 80) {
        baseProfile.capabilities.push('fast-rendering');
      }

    } catch (error) {
      console.warn('Performance benchmarks failed:', error);
    }

    return baseProfile;
  }

  // Detection helper methods
  private detectCPUArchitecture(): string {
    const ua = navigator.userAgent;
    if (ua.includes('x64') || ua.includes('x86_64')) return 'x64';
    if (ua.includes('arm64')) return 'arm64';
    if (ua.includes('arm')) return 'arm';
    return 'unknown';
  }

  private detectCPUVendor(): string {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('intel')) return 'Intel';
    if (ua.includes('amd')) return 'AMD';
    if (ua.includes('arm')) return 'ARM';
    return 'Unknown';
  }

  private detectGPUVendor(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (renderer.includes('NVIDIA')) return 'NVIDIA';
          if (renderer.includes('AMD') || renderer.includes('ATI')) return 'AMD';
          if (renderer.includes('Intel')) return 'Intel';
        }
      }
    } catch (error) {
      // GPU detection failed
    }
    return 'Unknown';
  }

  private detectGPUModel(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          return (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch (error) {
      // GPU model detection failed
    }
    return 'Unknown';
  }

  private detectGPUVRAM(): number {
    // Cannot reliably detect VRAM in browser
    return 0;
  }

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  private checkWebGL2Support(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch {
      return false;
    }
  }

  private getMaxTextureSize(): number {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        return (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).MAX_TEXTURE_SIZE);
      }
    } catch {
      // WebGL not supported
    }
    return 0;
  }

  private getMaxRenderbufferSize(): number {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        return (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).MAX_RENDERBUFFER_SIZE);
      }
    } catch {
      // WebGL not supported
    }
    return 0;
  }

  private detectBrowserName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  private detectBrowserVersion(): string {
    const ua = navigator.userAgent;
    const match = ua.match(/(?:Chrome|Firefox|Safari|Edge|Opera)\/(\d+)/);
    return match ? match[1] : '0.0';
  }

  private detectBrowserEngine(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') || ua.includes('Edge')) return 'Blink';
    if (ua.includes('Firefox')) return 'Gecko';
    if (ua.includes('Safari')) return 'WebKit';
    return 'Unknown';
  }

  private detectOSName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private detectOSVersion(): string {
    const ua = navigator.userAgent;
    // Simplified version detection
    const match = ua.match(/(?:Windows NT |Mac OS X |Android |iOS )([^;)]+)/);
    return match ? match[1] : 'Unknown';
  }

  private detectOSArchitecture(): string {
    const ua = navigator.userAgent;
    if (ua.includes('x64') || ua.includes('x86_64')) return '64-bit';
    if (ua.includes('arm64')) return 'ARM64';
    if (ua.includes('arm')) return 'ARM';
    return 'Unknown';
  }

  private detectNetworkType(): SoftwareCapabilities['network']['type'] {
    const connection = (navigator as any).connection;
    if (connection) {
      switch (connection.type) {
        case 'ethernet': return 'ethernet';
        case 'wifi': return 'wifi';
        case 'cellular': return 'cellular';
      }
    }
    return 'unknown';
  }

  private detectNetworkSpeed(): SoftwareCapabilities['network']['speed'] {
    const connection = (navigator as any).connection;
    if (connection) {
      const downlink = connection.downlink;
      if (downlink >= 5) return 'fast';
      if (downlink >= 1) return 'medium';
      return 'slow';
    }
    return 'medium'; // Default assumption
  }

  // Performance testing methods (simplified)
  private async testCPUPerformance(): Promise<{ estimatedFrequency: number }> {
    const startTime = performance.now();
    let iterations = 0;

    // Simple CPU benchmark
    while (performance.now() - startTime < 100) {
      for (let i = 0; i < 10000; i++) {
        Math.sqrt(i);
      }
      iterations++;
    }

    // Estimate frequency based on iterations
    const estimatedFrequency = iterations * 10; // Rough estimation

    return { estimatedFrequency };
  }

  private async testMemoryPerformance(): Promise<{ available: number }> {
    // Cannot reliably test available memory in browser
    return { available: this.hardwareCapabilities.memory.total * 0.8 }; // Estimate
  }

  private async testStoragePerformance(): Promise<Partial<HardwareCapabilities['storage']>> {
    // Cannot reliably test storage in browser
    return {};
  }

  private async testNetworkPerformance(): Promise<{ latency: number }> {
    try {
      const startTime = performance.now();
      const response = await fetch('/api/ping', { method: 'HEAD' });
      const latency = performance.now() - startTime;
      return { latency };
    } catch {
      return { latency: 1000 }; // Default high latency
    }
  }

  private async runPerformanceBenchmarks(): Promise<{
    jsPerformance: number;
    renderPerformance: number;
    adjustment: number;
  }> {
    // Simplified benchmarks
    const jsPerformance = await this.benchmarkJSPerformance();
    const renderPerformance = await this.benchmarkRenderPerformance();

    const adjustment = (jsPerformance + renderPerformance) / 2 - 50;

    return {
      jsPerformance,
      renderPerformance,
      adjustment
    };
  }

  private async benchmarkJSPerformance(): Promise<number> {
    const startTime = performance.now();
    let result = 0;

    // Simple JS benchmark
    for (let i = 0; i < 100000; i++) {
      result += Math.sin(i) * Math.cos(i);
    }

    const time = performance.now() - startTime;
    // Convert to 0-100 scale (lower time = higher performance)
    return Math.max(0, Math.min(100, 100 - time / 10));
  }

  private async benchmarkRenderPerformance(): Promise<number> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(0);
        return;
      }

      canvas.width = 800;
      canvas.height = 600;

      const startTime = performance.now();
      let frames = 0;

      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = `hsl(${frames % 360}, 50%, 50%)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        frames++;
        if (frames < 60) {
          requestAnimationFrame(render);
        } else {
          const time = performance.now() - startTime;
          // Convert to 0-100 scale (lower time = higher performance)
          resolve(Math.max(0, Math.min(100, 100 - time / 16.67)));
        }
      };

      requestAnimationFrame(render);
    });
  }

  private async loadCachedResults(): Promise<void> {
    try {
      const cached = localStorage.getItem('device_capabilities_cache');
      if (cached) {
        const cacheData = JSON.parse(cached);
        const cacheAge = Date.now() - cacheData.timestamp;

        if (cacheAge < this.config.cacheDuration) {
          Object.assign(this.hardwareCapabilities, cacheData.hardwareCapabilities);
          Object.assign(this.softwareCapabilities, cacheData.softwareCapabilities);
          Object.assign(this.performanceProfile, cacheData.performanceProfile);
        }
      }
    } catch (error) {
      console.warn('Failed to load cached results:', error);
    }
  }

  private async cacheResults(): Promise<void> {
    try {
      const cacheData = {
        timestamp: Date.now(),
        hardwareCapabilities: this.hardwareCapabilities,
        softwareCapabilities: this.softwareCapabilities,
        performanceProfile: this.performanceProfile
      };

      localStorage.setItem('device_capabilities_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache results:', error);
    }
  }

  /**
   * Destroy the detector and clean up resources
   */
  destroy(): void {
    this.detectionCache.clear();
  }
}

// Export singleton instance
export const deviceCapabilityDetector = new DeviceCapabilityDetector();
