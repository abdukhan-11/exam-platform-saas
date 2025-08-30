/**
 * Adaptive Rendering System
 *
 * Intelligent rendering system that adapts the UI based on device capabilities,
 * performance metrics, and user preferences for optimal exam experience.
 */

import { browserCompatibilityManager, BrowserInfo } from './browser-compatibility';
import { performanceMonitor, PerformanceMetrics } from './performance-monitor';
import { auditLogger } from './audit-logger';

export interface DeviceCapabilities {
  screenSize: { width: number; height: number };
  pixelRatio: number;
  touchSupport: boolean;
  gpuAcceleration: boolean;
  maxTextureSize: number;
  supportedFormats: string[];
  hardwareConcurrency: number;
  deviceMemory: number; // GB
}

export interface RenderingProfile {
  id: string;
  name: string;
  description: string;
  targetDevices: string[];
  performanceRequirements: {
    minFPS: number;
    maxMemoryUsage: number;
    maxInitialLoadTime: number;
  };
  renderingOptions: {
    enableAnimations: boolean;
    animationComplexity: 'low' | 'medium' | 'high';
    enableShadows: boolean;
    enableBlur: boolean;
    imageQuality: 'low' | 'medium' | 'high';
    fontRendering: 'aliased' | 'antialiased' | 'subpixel';
    layoutComplexity: 'simple' | 'moderate' | 'complex';
  };
  featureFlags: {
    enableWebGL: boolean;
    enableCanvas: boolean;
    enableSVG: boolean;
    enableVideo: boolean;
    enableAdvancedCSS: boolean;
  };
}

export interface AdaptiveConfig {
  enableAdaptiveRendering: boolean;
  performanceMonitoringEnabled: boolean;
  profileSwitchingEnabled: boolean;
  qualityAdjustmentEnabled: boolean;
  automaticOptimization: boolean;
  userPreferenceOverride: boolean;
}

export class AdaptiveRenderingManager {
  private config: AdaptiveConfig;
  private currentProfile: RenderingProfile;
  private deviceCapabilities: DeviceCapabilities;
  private renderingProfiles: RenderingProfile[];
  private profileSwitchCooldown = 0;
  private isInitialized = false;

  constructor(config: Partial<AdaptiveConfig> = {}) {
    this.config = {
      enableAdaptiveRendering: true,
      performanceMonitoringEnabled: true,
      profileSwitchingEnabled: true,
      qualityAdjustmentEnabled: true,
      automaticOptimization: true,
      userPreferenceOverride: false,
      ...config
    };

    this.deviceCapabilities = this.detectDeviceCapabilities();
    this.renderingProfiles = this.createRenderingProfiles();
    this.currentProfile = this.selectInitialProfile();
  }

  /**
   * Initialize the adaptive rendering manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up performance monitoring
      if (this.config.performanceMonitoringEnabled) {
        await performanceMonitor.initialize();
      }

      // Apply initial rendering profile
      await this.applyRenderingProfile(this.currentProfile);

      // Set up adaptive monitoring
      if (this.config.enableAdaptiveRendering) {
        this.setupAdaptiveMonitoring();
      }

      this.isInitialized = true;

      auditLogger.logExamSecurity('exam_started', {
        examId: 'system',
        userId: 'system',
        sessionId: 'system',
        severity: 'low',
        description: 'Adaptive rendering manager initialized',
        metadata: {
          currentProfile: this.currentProfile.name,
          deviceCapabilities: {
            screenSize: this.deviceCapabilities.screenSize,
            hardwareConcurrency: this.deviceCapabilities.hardwareConcurrency,
            deviceMemory: this.deviceCapabilities.deviceMemory
          }
        }
      });
    } catch (error) {
      console.error('Failed to initialize adaptive rendering manager:', error);
      throw error;
    }
  }

  /**
   * Get current rendering profile
   */
  getCurrentProfile(): RenderingProfile {
    return { ...this.currentProfile };
  }

  /**
   * Get device capabilities
   */
  getDeviceCapabilities(): DeviceCapabilities {
    return { ...this.deviceCapabilities };
  }

  /**
   * Get available rendering profiles
   */
  getAvailableProfiles(): RenderingProfile[] {
    return this.renderingProfiles.map(profile => ({ ...profile }));
  }

  /**
   * Manually set rendering profile
   */
  async setProfile(profileId: string): Promise<boolean> {
    if (!this.config.userPreferenceOverride) {
      console.warn('Profile switching disabled by configuration');
      return false;
    }

    const profile = this.renderingProfiles.find(p => p.id === profileId);
    if (!profile) {
      console.error(`Profile not found: ${profileId}`);
      return false;
    }

    await this.applyRenderingProfile(profile);
    this.currentProfile = profile;

    auditLogger.logExamSecurity('copy_paste', {
      examId: 'system',
      userId: 'system',
      sessionId: 'system',
      severity: 'low',
      description: 'Rendering profile manually changed',
      metadata: {
        oldProfile: this.currentProfile.id,
        newProfile: profileId
      }
    });

    return true;
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): {
    currentProfile: string;
    suggestedProfile?: string;
    recommendations: string[];
    performanceImpact: 'low' | 'medium' | 'high';
  } {
    const currentMetrics = performanceMonitor.getCurrentMetrics();
    const recommendations: string[] = [];

    let suggestedProfile: string | undefined;
    let performanceImpact: 'low' | 'medium' | 'high' = 'low';

    // Check if current profile is optimal
    if (currentMetrics.rendering.fps < this.currentProfile.performanceRequirements.minFPS) {
      recommendations.push('Current FPS is below recommended threshold');
      const betterProfile = this.findBetterProfile('performance');
      if (betterProfile) {
        suggestedProfile = betterProfile.id;
        performanceImpact = 'high';
      }
    }

    if (currentMetrics.memoryUsage.percentage > 80) {
      recommendations.push('High memory usage detected');
      performanceImpact = 'high';
    }

    if (currentMetrics.network.averageResponseTime > 2000) {
      recommendations.push('Slow network performance');
      performanceImpact = 'medium';
    }

    return {
      currentProfile: this.currentProfile.name,
      suggestedProfile,
      recommendations,
      performanceImpact
    };
  }

  /**
   * Optimize rendering for current conditions
   */
  async optimizeRendering(): Promise<void> {
    if (!this.config.automaticOptimization) return;

    const metrics = performanceMonitor.getCurrentMetrics();
    const recommendations = this.getPerformanceRecommendations();

    if (recommendations.suggestedProfile && Date.now() > this.profileSwitchCooldown) {
      const newProfile = this.renderingProfiles.find(p => p.id === recommendations.suggestedProfile);
      if (newProfile) {
        await this.applyRenderingProfile(newProfile);
        this.currentProfile = newProfile;
        this.profileSwitchCooldown = Date.now() + 30000; // 30 second cooldown

        auditLogger.logExamSecurity('copy_paste', {
          examId: 'system',
          userId: 'system',
          sessionId: 'system',
          severity: 'medium',
          description: 'Automatic profile optimization applied',
          metadata: {
            oldProfile: this.currentProfile.id,
            newProfile: newProfile.id,
            reason: recommendations.recommendations.join(', ')
          }
        });
      }
    }
  }

  /**
   * Detect device capabilities
   */
  private detectDeviceCapabilities(): DeviceCapabilities {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    return {
      screenSize: {
        width: window.screen.width,
        height: window.screen.height
      },
      pixelRatio: window.devicePixelRatio || 1,
      touchSupport: 'ontouchstart' in window,
      gpuAcceleration: !!gl,
      maxTextureSize: gl ? (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).MAX_TEXTURE_SIZE) : 0,
      supportedFormats: this.detectSupportedFormats(),
      hardwareConcurrency: navigator.hardwareConcurrency || 2,
      deviceMemory: (navigator as any).deviceMemory || 2
    };
  }

  /**
   * Create rendering profiles
   */
  private createRenderingProfiles(): RenderingProfile[] {
    return [
      {
        id: 'high-end',
        name: 'High-End Desktop',
        description: 'Full-featured rendering for powerful devices',
        targetDevices: ['desktop', 'laptop'],
        performanceRequirements: {
          minFPS: 60,
          maxMemoryUsage: 70,
          maxInitialLoadTime: 1000
        },
        renderingOptions: {
          enableAnimations: true,
          animationComplexity: 'high',
          enableShadows: true,
          enableBlur: true,
          imageQuality: 'high',
          fontRendering: 'subpixel',
          layoutComplexity: 'complex'
        },
        featureFlags: {
          enableWebGL: true,
          enableCanvas: true,
          enableSVG: true,
          enableVideo: true,
          enableAdvancedCSS: true
        }
      },
      {
        id: 'standard',
        name: 'Standard Performance',
        description: 'Balanced rendering for typical devices',
        targetDevices: ['desktop', 'laptop', 'tablet'],
        performanceRequirements: {
          minFPS: 30,
          maxMemoryUsage: 80,
          maxInitialLoadTime: 2000
        },
        renderingOptions: {
          enableAnimations: true,
          animationComplexity: 'medium',
          enableShadows: true,
          enableBlur: false,
          imageQuality: 'medium',
          fontRendering: 'antialiased',
          layoutComplexity: 'moderate'
        },
        featureFlags: {
          enableWebGL: true,
          enableCanvas: true,
          enableSVG: true,
          enableVideo: true,
          enableAdvancedCSS: false
        }
      },
      {
        id: 'low-end',
        name: 'Low-End Device',
        description: 'Optimized rendering for limited devices',
        targetDevices: ['mobile', 'tablet', 'desktop'],
        performanceRequirements: {
          minFPS: 20,
          maxMemoryUsage: 90,
          maxInitialLoadTime: 3000
        },
        renderingOptions: {
          enableAnimations: false,
          animationComplexity: 'low',
          enableShadows: false,
          enableBlur: false,
          imageQuality: 'low',
          fontRendering: 'aliased',
          layoutComplexity: 'simple'
        },
        featureFlags: {
          enableWebGL: false,
          enableCanvas: true,
          enableSVG: false,
          enableVideo: false,
          enableAdvancedCSS: false
        }
      },
      {
        id: 'mobile-optimized',
        name: 'Mobile Optimized',
        description: 'Touch-optimized rendering for mobile devices',
        targetDevices: ['mobile', 'tablet'],
        performanceRequirements: {
          minFPS: 30,
          maxMemoryUsage: 75,
          maxInitialLoadTime: 1500
        },
        renderingOptions: {
          enableAnimations: true,
          animationComplexity: 'low',
          enableShadows: false,
          enableBlur: false,
          imageQuality: 'medium',
          fontRendering: 'antialiased',
          layoutComplexity: 'simple'
        },
        featureFlags: {
          enableWebGL: false,
          enableCanvas: true,
          enableSVG: true,
          enableVideo: true,
          enableAdvancedCSS: false
        }
      }
    ];
  }

  /**
   * Select initial rendering profile
   */
  private selectInitialProfile(): RenderingProfile {
    const browserInfo = browserCompatibilityManager.getBrowserInfo();

    // Select based on device type
    if (this.deviceCapabilities.touchSupport && this.deviceCapabilities.screenSize.width < 768) {
      return this.renderingProfiles.find(p => p.id === 'mobile-optimized')!;
    }

    // Select based on hardware capabilities
    if (this.deviceCapabilities.hardwareConcurrency >= 8 && this.deviceCapabilities.deviceMemory >= 8) {
      return this.renderingProfiles.find(p => p.id === 'high-end')!;
    }

    if (this.deviceCapabilities.hardwareConcurrency >= 4 && this.deviceCapabilities.deviceMemory >= 4) {
      return this.renderingProfiles.find(p => p.id === 'standard')!;
    }

    return this.renderingProfiles.find(p => p.id === 'low-end')!;
  }

  /**
   * Apply rendering profile
   */
  private async applyRenderingProfile(profile: RenderingProfile): Promise<void> {
    const root = document.documentElement;

    // Apply CSS custom properties
    root.style.setProperty('--animation-duration', profile.renderingOptions.enableAnimations ? '0.3s' : '0s');
    root.style.setProperty('--image-quality', profile.renderingOptions.imageQuality);
    root.style.setProperty('--font-rendering', profile.renderingOptions.fontRendering);

    // Apply feature flags
    this.applyFeatureFlags(profile.featureFlags);

    // Apply rendering optimizations
    await this.applyRenderingOptimizations(profile.renderingOptions);

    // Update meta viewport for mobile
    if (profile.id === 'mobile-optimized') {
      this.optimizeForMobile();
    }
  }

  /**
   * Apply feature flags
   */
  private applyFeatureFlags(flags: RenderingProfile['featureFlags']): void {
    // Disable/enable features based on flags
    if (!flags.enableWebGL) {
      // Disable WebGL-dependent features
      console.log('WebGL features disabled');
    }

    if (!flags.enableAdvancedCSS) {
      // Disable advanced CSS features
      this.disableAdvancedCSS();
    }

    if (!flags.enableVideo) {
      // Disable video elements
      this.disableVideoElements();
    }
  }

  /**
   * Apply rendering optimizations
   */
  private async applyRenderingOptimizations(options: RenderingProfile['renderingOptions']): Promise<void> {
    // Optimize animations
    if (!options.enableAnimations) {
      this.disableAnimations();
    } else {
      this.optimizeAnimationComplexity(options.animationComplexity);
    }

    // Optimize shadows and blur
    if (!options.enableShadows) {
      this.disableShadows();
    }

    if (!options.enableBlur) {
      this.disableBlurEffects();
    }

    // Optimize image quality
    await this.optimizeImageQuality(options.imageQuality);

    // Optimize layout complexity
    this.optimizeLayoutComplexity(options.layoutComplexity);
  }

  /**
   * Set up adaptive monitoring
   */
  private setupAdaptiveMonitoring(): void {
    // Monitor performance every 30 seconds
    setInterval(async () => {
      await this.optimizeRendering();
    }, 30000);
  }

  /**
   * Find better profile for current conditions
   */
  private findBetterProfile(reason: 'performance' | 'memory' | 'network'): RenderingProfile | null {
    const currentIndex = this.renderingProfiles.findIndex(p => p.id === this.currentProfile.id);

    switch (reason) {
      case 'performance':
        // Try a lower-performance profile
        for (let i = currentIndex + 1; i < this.renderingProfiles.length; i++) {
          const profile = this.renderingProfiles[i];
          if (this.isProfileSuitable(profile)) {
            return profile;
          }
        }
        break;

      case 'memory':
        // Try a memory-optimized profile
        return this.renderingProfiles.find(p => p.id === 'low-end') || null;

      case 'network':
        // Try a network-optimized profile
        return this.renderingProfiles.find(p => p.id === 'mobile-optimized') || null;
    }

    return null;
  }

  /**
   * Check if profile is suitable for current device
   */
  private isProfileSuitable(profile: RenderingProfile): boolean {
    // Check hardware requirements
    if (profile.id === 'high-end' &&
        (this.deviceCapabilities.hardwareConcurrency < 8 || this.deviceCapabilities.deviceMemory < 8)) {
      return false;
    }

    // Check mobile requirements
    if (profile.id === 'mobile-optimized' && !this.deviceCapabilities.touchSupport) {
      return false;
    }

    return true;
  }

  /**
   * Detect supported image formats
   */
  private detectSupportedFormats(): string[] {
    const formats: string[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return formats;

    // Test WebP support
    try {
      const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      if (webpSupported) formats.push('webp');
    } catch (e) {
      // WebP not supported
    }

    // Always support PNG and JPEG
    formats.push('png', 'jpeg');

    return formats;
  }

  /**
   * Disable animations
   */
  private disableAnimations(): void {
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Optimize animation complexity
   */
  private optimizeAnimationComplexity(complexity: 'low' | 'medium' | 'high'): void {
    const durations = {
      low: '0.1s',
      medium: '0.2s',
      high: '0.3s'
    };

    document.documentElement.style.setProperty('--animation-duration', durations[complexity]);
  }

  /**
   * Disable shadows
   */
  private disableShadows(): void {
    const style = document.createElement('style');
    style.textContent = `
      * {
        box-shadow: none !important;
        text-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Disable blur effects
   */
  private disableBlurEffects(): void {
    const style = document.createElement('style');
    style.textContent = `
      * {
        filter: none !important;
        backdrop-filter: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Optimize image quality
   */
  private async optimizeImageQuality(quality: 'low' | 'medium' | 'high'): Promise<void> {
    // This would typically involve adjusting image loading strategies
    console.log(`Optimizing images for ${quality} quality`);
  }

  /**
   * Optimize layout complexity
   */
  private optimizeLayoutComplexity(complexity: 'simple' | 'moderate' | 'complex'): void {
    // Adjust CSS grid/flexbox complexity based on device capabilities
    console.log(`Optimizing layout for ${complexity} complexity`);
  }

  /**
   * Disable advanced CSS features
   */
  private disableAdvancedCSS(): void {
    const style = document.createElement('style');
    style.textContent = `
      * {
        transform: none !important;
        clip-path: none !important;
        mask: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Disable video elements
   */
  private disableVideoElements(): void {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.style.display = 'none';
    });
  }

  /**
   * Optimize for mobile devices
   */
  private optimizeForMobile(): void {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }
  }

  /**
   * Destroy the manager and clean up resources
   */
  destroy(): void {
    // Reset to default rendering
    document.documentElement.style.removeProperty('--animation-duration');
    document.documentElement.style.removeProperty('--image-quality');
    document.documentElement.style.removeProperty('--font-rendering');
  }
}

// Export singleton instance
export const adaptiveRenderingManager = new AdaptiveRenderingManager();
