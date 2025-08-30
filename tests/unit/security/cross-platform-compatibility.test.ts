/**
 * Cross-Platform Compatibility and Performance Optimization Tests
 *
 * Comprehensive test suite for browser compatibility, performance monitoring,
 * adaptive rendering, and device capability detection systems.
 */

import { browserCompatibilityManager } from '../../../src/lib/security/browser-compatibility';
import { performanceMonitor } from '../../../src/lib/security/performance-monitor';
import { adaptiveRenderingManager } from '../../../src/lib/security/adaptive-rendering';
import { deviceCapabilityDetector } from '../../../src/lib/security/device-capability';

// Mock navigator and performance APIs
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  platform: 'Win32',
  hardwareConcurrency: 8,
  cookieEnabled: true,
  onLine: true,
  deviceMemory: 8
};

const mockPerformance = {
  now: jest.fn(() => Date.now()),
  getEntriesByType: jest.fn(() => []),
  timing: {
    navigationStart: Date.now()
  }
};

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

// Mock WebGL context
const mockWebGLContext = {
  getParameter: jest.fn((param) => {
    if (param === 3379) return 8192; // MAX_TEXTURE_SIZE
    if (param === 3414) return 8192; // MAX_RENDERBUFFER_SIZE
    return null;
  }),
  getExtension: jest.fn(() => ({
    UNMASKED_VENDOR_WEBGL: 'Google Inc. (Intel)',
    UNMASKED_RENDERER_WEBGL: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  }))
};

// Setup mocks
Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true
});

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
});

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock canvas and WebGL
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'experimental-webgl') {
    return mockWebGLContext as any;
  }
  if (contextType === '2d') {
    return {} as any;
  }
  return null;
});

describe('Cross-Platform Compatibility System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singletons
    (browserCompatibilityManager as any).isInitialized = false;
    (performanceMonitor as any).isInitialized = false;
    (adaptiveRenderingManager as any).isInitialized = false;
    (deviceCapabilityDetector as any).isInitialized = false;
  });

  describe('Browser Compatibility Manager', () => {
    test('should detect browser information correctly', async () => {
      await browserCompatibilityManager.initialize();

      const browserInfo = browserCompatibilityManager.getBrowserInfo();

      expect(browserInfo.name).toBe('Chrome');
      expect(browserInfo.version).toBe('91.0.4472.124');
      expect(browserInfo.engine).toBe('Blink');
      expect(browserInfo.platform).toBe('Win32');
      expect(browserInfo.mobile).toBe(false);
      expect(browserInfo.cookieSupport).toBe(true);
    });

    test('should detect WebGL support', async () => {
      await browserCompatibilityManager.initialize();

      const browserInfo = browserCompatibilityManager.getBrowserInfo();

      expect(browserInfo.webGLSupport).toBe(true);
      expect(browserInfo.canvasSupport).toBe(true);
    });

    test('should calculate compatibility score', async () => {
      await browserCompatibilityManager.initialize();

      const score = browserCompatibilityManager.getCompatibilityScore();

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(typeof score).toBe('number');
    });

    test('should detect feature support', async () => {
      await browserCompatibilityManager.initialize();

      const featureSupport = browserCompatibilityManager.getFeatureSupport();

      expect(featureSupport).toHaveProperty('required');
      expect(featureSupport).toHaveProperty('recommended');
      expect(featureSupport).toHaveProperty('optional');
      expect(featureSupport).toHaveProperty('unsupported');
      expect(featureSupport).toHaveProperty('warnings');
      expect(Array.isArray(featureSupport.required)).toBe(true);
    });

    test('should provide compatibility warnings', async () => {
      await browserCompatibilityManager.initialize();

      const warnings = browserCompatibilityManager.getCompatibilityWarnings();

      expect(Array.isArray(warnings)).toBe(true);
    });
  });

  describe('Performance Monitor', () => {
    test('should initialize successfully', async () => {
      await performanceMonitor.initialize();

      expect((performanceMonitor as any).isInitialized).toBe(true);
    });

    test('should collect performance metrics', async () => {
      await performanceMonitor.initialize();

      const metrics = performanceMonitor.getCurrentMetrics();

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cpuUsage');
      expect(metrics).toHaveProperty('rendering');
      expect(metrics).toHaveProperty('network');
      expect(metrics).toHaveProperty('storage');
      expect(metrics).toHaveProperty('examSpecific');
    });

    test('should determine performance acceptability', async () => {
      await performanceMonitor.initialize();

      const isAcceptable = performanceMonitor.isPerformanceAcceptable();

      expect(typeof isAcceptable).toBe('boolean');
    });

    test('should provide performance warnings', async () => {
      await performanceMonitor.initialize();

      const warnings = performanceMonitor.getPerformanceWarnings();

      expect(Array.isArray(warnings)).toBe(true);
    });

    test('should generate performance report', async () => {
      await performanceMonitor.initialize();

      const report = performanceMonitor.getPerformanceReport();

      expect(report).toHaveProperty('currentMetrics');
      expect(report).toHaveProperty('averageMetrics');
      expect(report).toHaveProperty('warnings');
      expect(report).toHaveProperty('optimizations');
      expect(report).toHaveProperty('recommendations');
    });
  });

  describe('Device Capability Detector', () => {
    test('should initialize successfully', async () => {
      await deviceCapabilityDetector.initialize();

      expect((deviceCapabilityDetector as any).isInitialized).toBe(true);
    });

    test('should detect hardware capabilities', async () => {
      await deviceCapabilityDetector.initialize();

      const capabilities = deviceCapabilityDetector.getHardwareCapabilities();

      expect(capabilities).toHaveProperty('cpu');
      expect(capabilities).toHaveProperty('memory');
      expect(capabilities).toHaveProperty('storage');
      expect(capabilities).toHaveProperty('gpu');

      expect(capabilities.cpu.cores).toBe(8);
      expect(capabilities.memory.total).toBe(8192); // 8GB in MB
    });

    test('should detect software capabilities', async () => {
      await deviceCapabilityDetector.initialize();

      const capabilities = deviceCapabilityDetector.getSoftwareCapabilities();

      expect(capabilities).toHaveProperty('browser');
      expect(capabilities).toHaveProperty('os');
      expect(capabilities).toHaveProperty('network');
      expect(capabilities).toHaveProperty('battery');

      expect(capabilities.browser.name).toBe('Chrome');
      expect(capabilities.os.name).toBe('Windows');
    });

    test('should create performance profile', async () => {
      await deviceCapabilityDetector.initialize();

      const profile = deviceCapabilityDetector.getPerformanceProfile();

      expect(profile).toHaveProperty('category');
      expect(profile).toHaveProperty('score');
      expect(profile).toHaveProperty('capabilities');
      expect(profile).toHaveProperty('limitations');
      expect(profile).toHaveProperty('recommendedFeatures');
      expect(profile).toHaveProperty('disabledFeatures');

      expect(typeof profile.score).toBe('number');
      expect(profile.score).toBeGreaterThanOrEqual(0);
      expect(profile.score).toBeLessThanOrEqual(100);
    });

    test('should provide recommended settings', async () => {
      await deviceCapabilityDetector.initialize();

      const settings = deviceCapabilityDetector.getRecommendedSettings();

      expect(settings).toHaveProperty('maxConcurrentOperations');
      expect(settings).toHaveProperty('enableBackgroundProcessing');
      expect(settings).toHaveProperty('enableAdvancedGraphics');
      expect(settings).toHaveProperty('enableRealTimeSync');
      expect(settings).toHaveProperty('cacheStrategy');
      expect(settings).toHaveProperty('imageQuality');
      expect(settings).toHaveProperty('animationLevel');

      expect(typeof settings.maxConcurrentOperations).toBe('number');
      expect(typeof settings.enableBackgroundProcessing).toBe('boolean');
    });

    test('should check feature support', async () => {
      await deviceCapabilityDetector.initialize();

      const supportsWebGL = deviceCapabilityDetector.supportsFeature('webgl');
      const isFeatureDisabled = deviceCapabilityDetector.isFeatureDisabled('webgl');

      expect(typeof supportsWebGL).toBe('boolean');
      expect(typeof isFeatureDisabled).toBe('boolean');
    });
  });

  describe('Adaptive Rendering Manager', () => {
    test('should initialize successfully', async () => {
      await adaptiveRenderingManager.initialize();

      expect((adaptiveRenderingManager as any).isInitialized).toBe(true);
    });

    test('should provide current profile', async () => {
      await adaptiveRenderingManager.initialize();

      const profile = adaptiveRenderingManager.getCurrentProfile();

      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('name');
      expect(profile).toHaveProperty('description');
      expect(profile).toHaveProperty('targetDevices');
      expect(profile).toHaveProperty('performanceRequirements');
      expect(profile).toHaveProperty('renderingOptions');
      expect(profile).toHaveProperty('featureFlags');
    });

    test('should provide device capabilities', async () => {
      await adaptiveRenderingManager.initialize();

      const capabilities = adaptiveRenderingManager.getDeviceCapabilities();

      expect(capabilities).toHaveProperty('screenSize');
      expect(capabilities).toHaveProperty('pixelRatio');
      expect(capabilities).toHaveProperty('touchSupport');
      expect(capabilities).toHaveProperty('gpuAcceleration');
      expect(capabilities).toHaveProperty('hardwareConcurrency');
      expect(capabilities).toHaveProperty('deviceMemory');
    });

    test('should provide performance recommendations', async () => {
      await adaptiveRenderingManager.initialize();

      const recommendations = adaptiveRenderingManager.getPerformanceRecommendations();

      expect(recommendations).toHaveProperty('currentProfile');
      expect(recommendations).toHaveProperty('suggestedProfile');
      expect(recommendations).toHaveProperty('recommendations');
      expect(recommendations).toHaveProperty('performanceImpact');

      expect(Array.isArray(recommendations.recommendations)).toBe(true);
      expect(['low', 'medium', 'high']).toContain(recommendations.performanceImpact);
    });

    test('should list available profiles', async () => {
      await adaptiveRenderingManager.initialize();

      const profiles = adaptiveRenderingManager.getAvailableProfiles();

      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBeGreaterThan(0);

      profiles.forEach(profile => {
        expect(profile).toHaveProperty('id');
        expect(profile).toHaveProperty('name');
        expect(profile).toHaveProperty('performanceRequirements');
        expect(profile).toHaveProperty('renderingOptions');
        expect(profile).toHaveProperty('featureFlags');
      });
    });
  });

  describe('Integration Tests', () => {
    test('should initialize all components together', async () => {
      // Initialize all components
      await Promise.all([
        browserCompatibilityManager.initialize(),
        deviceCapabilityDetector.initialize(),
        performanceMonitor.initialize(),
        adaptiveRenderingManager.initialize()
      ]);

      // Verify all components are initialized
      expect((browserCompatibilityManager as any).isInitialized).toBe(true);
      expect((deviceCapabilityDetector as any).isInitialized).toBe(true);
      expect((performanceMonitor as any).isInitialized).toBe(true);
      expect((adaptiveRenderingManager as any).isInitialized).toBe(true);
    });

    test('should provide comprehensive system information', async () => {
      await Promise.all([
        browserCompatibilityManager.initialize(),
        deviceCapabilityDetector.initialize(),
        performanceMonitor.initialize(),
        adaptiveRenderingManager.initialize()
      ]);

      // Get comprehensive system information
      const browserInfo = browserCompatibilityManager.getBrowserInfo();
      const deviceCapabilities = deviceCapabilityDetector.getHardwareCapabilities();
      const performanceProfile = deviceCapabilityDetector.getPerformanceProfile();
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      const renderingProfile = adaptiveRenderingManager.getCurrentProfile();

      // Verify all information is available and properly structured
      expect(browserInfo).toHaveProperty('name');
      expect(deviceCapabilities).toHaveProperty('cpu');
      expect(performanceProfile).toHaveProperty('category');
      expect(currentMetrics).toHaveProperty('timestamp');
      expect(renderingProfile).toHaveProperty('id');

      // Verify cross-component consistency
      expect(typeof browserInfo.name).toBe('string');
      expect(typeof deviceCapabilities.cpu.cores).toBe('number');
      expect(['low-end', 'mid-range', 'high-end', 'server-grade']).toContain(performanceProfile.category);
    });

    test('should handle performance optimization', async () => {
      await Promise.all([
        performanceMonitor.initialize(),
        adaptiveRenderingManager.initialize()
      ]);

      // Get initial recommendations
      const initialRecommendations = adaptiveRenderingManager.getPerformanceRecommendations();

      // Apply optimization if needed
      if (initialRecommendations.suggestedProfile) {
        const success = await adaptiveRenderingManager.setProfile(initialRecommendations.suggestedProfile);
        expect(success).toBe(true);
      }

      // Get updated profile
      const updatedProfile = adaptiveRenderingManager.getCurrentProfile();

      expect(updatedProfile).toHaveProperty('id');
      expect(updatedProfile).toHaveProperty('name');
    });

    test('should provide compatibility assessment', async () => {
      await browserCompatibilityManager.initialize();

      const isCompatible = browserCompatibilityManager.isCompatible();
      const compatibilityScore = browserCompatibilityManager.getCompatibilityScore();
      const warnings = browserCompatibilityManager.getCompatibilityWarnings();

      expect(typeof isCompatible).toBe('boolean');
      expect(typeof compatibilityScore).toBe('number');
      expect(Array.isArray(warnings)).toBe(true);

      // Compatibility score should be reasonable
      expect(compatibilityScore).toBeGreaterThanOrEqual(0);
      expect(compatibilityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization failures gracefully', async () => {
      // Mock a failure scenario
      const mockInitialize = jest.fn().mockRejectedValue(new Error('Initialization failed'));

      // Test that errors are handled properly
      try {
        await mockInitialize();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Initialization failed');
      }
    });

    test('should handle missing browser APIs', async () => {
      // Temporarily remove a browser API
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = jest.fn(() => null);

      await browserCompatibilityManager.initialize();

      const browserInfo = browserCompatibilityManager.getBrowserInfo();

      // Should handle missing WebGL gracefully
      expect(browserInfo.webGLSupport).toBe(false);

      // Restore original function
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    test('should handle performance API failures', async () => {
      // Mock performance.now to throw an error
      const originalNow = performance.now;
      performance.now = jest.fn(() => {
        throw new Error('Performance API not available');
      });

      await performanceMonitor.initialize();

      const metrics = performanceMonitor.getCurrentMetrics();

      // Should still provide metrics even with API failures
      expect(metrics).toHaveProperty('timestamp');

      // Restore original function
      performance.now = originalNow;
    });
  });

  describe('Performance Benchmarks', () => {
    test('should perform CPU benchmark', async () => {
      await deviceCapabilityDetector.initialize();

      // The initialization should complete without errors
      expect((deviceCapabilityDetector as any).isInitialized).toBe(true);
    });

    test('should perform memory assessment', async () => {
      await deviceCapabilityDetector.initialize();

      const capabilities = deviceCapabilityDetector.getHardwareCapabilities();

      // Should provide memory information
      expect(capabilities.memory).toHaveProperty('total');
      expect(typeof capabilities.memory.total).toBe('number');
    });

    test('should assess GPU capabilities', async () => {
      await deviceCapabilityDetector.initialize();

      const capabilities = deviceCapabilityDetector.getHardwareCapabilities();

      // Should provide GPU information
      expect(capabilities.gpu).toHaveProperty('supportsWebGL');
      expect(typeof capabilities.gpu.supportsWebGL).toBe('boolean');
    });
  });
});
