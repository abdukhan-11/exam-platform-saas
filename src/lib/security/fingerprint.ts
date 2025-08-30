/**
 * Browser Fingerprinting and Device Identification System
 * 
 * This module provides comprehensive browser fingerprinting capabilities
 * for security validation and anti-cheating measures.
 */

export interface BrowserFingerprint {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  colorDepth: number;
  pixelRatio: number;
  hardwareConcurrency: number;
  deviceMemory?: number;
  canvasFingerprint: string;
  webglFingerprint: string;
  audioFingerprint: string;
  fonts: string[];
  plugins: string[];
  touchSupport: boolean;
  doNotTrack: string | null;
  cookieEnabled: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  webRTC: boolean;
  battery?: {
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
  };
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  timestamp: number;
  hash: string;
}

export interface DeviceInfo {
  deviceId: string;
  fingerprint: BrowserFingerprint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  deviceType: string;
}

class FingerprintService {
  private static instance: FingerprintService;
  private cachedFingerprint: BrowserFingerprint | null = null;

  static getInstance(): FingerprintService {
    if (!FingerprintService.instance) {
      FingerprintService.instance = new FingerprintService();
    }
    return FingerprintService.instance;
  }

  /**
   * Generate a comprehensive browser fingerprint
   */
  async generateFingerprint(): Promise<BrowserFingerprint> {
    if (this.cachedFingerprint) {
      return this.cachedFingerprint;
    }

    const fingerprint: Partial<BrowserFingerprint> = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      canvasFingerprint: await this.generateCanvasFingerprint(),
      webglFingerprint: await this.generateWebGLFingerprint(),
      audioFingerprint: await this.generateAudioFingerprint(),
      fonts: await this.detectFonts(),
      plugins: this.getPlugins(),
      touchSupport: 'ontouchstart' in window,
      doNotTrack: navigator.doNotTrack,
      cookieEnabled: navigator.cookieEnabled,
      localStorage: this.testStorage('localStorage'),
      sessionStorage: this.testStorage('sessionStorage'),
      indexedDB: this.testIndexedDB(),
      webRTC: this.testWebRTC(),
      timestamp: Date.now(),
    };

    // Get battery info if available
    try {
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        fingerprint.battery = {
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
          level: battery.level,
        };
      }
    } catch (error) {
      // Battery API not available
    }

    // Get connection info if available
    try {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        fingerprint.connection = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
        };
      }
    } catch (error) {
      // Connection API not available
    }

    const fullFingerprint = fingerprint as BrowserFingerprint;
    fullFingerprint.hash = await this.generateHash(fullFingerprint);
    
    this.cachedFingerprint = fullFingerprint;
    return fullFingerprint;
  }

  /**
   * Generate canvas fingerprint
   */
  private async generateCanvasFingerprint(): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      canvas.width = 200;
      canvas.height = 50;

      // Draw text with various fonts and styles
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.font = '11px Arial';
      ctx.fillText('Browser fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.font = '18px Arial';
      ctx.fillText('Security check', 4, 25);

      // Add some geometric shapes
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(255,0,255)';
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgb(0,255,255)';
      ctx.beginPath();
      ctx.arc(100, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgb(255,255,0)';
      ctx.beginPath();
      ctx.arc(75, 100, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      return canvas.toDataURL();
    } catch (error) {
      return '';
    }
  }

  /**
   * Generate WebGL fingerprint
   */
  private async generateWebGLFingerprint(): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (!gl) return '';

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info') as any;
      if (!debugInfo) return '';

      const vendor = gl.getParameter((debugInfo as any).UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter((debugInfo as any).UNMASKED_RENDERER_WEBGL);
      const version = gl.getParameter((gl as any).VERSION);
      const shadingLanguageVersion = gl.getParameter((gl as any).SHADING_LANGUAGE_VERSION);

      return JSON.stringify({
        vendor,
        renderer,
        version,
        shadingLanguageVersion,
      });
    } catch (error) {
      return '';
    }
  }

  /**
   * Generate audio fingerprint
   */
  private async generateAudioFingerprint(): Promise<string> {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);

      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(0);

      return new Promise((resolve) => {
        scriptProcessor.onaudioprocess = (event) => {
          const buffer = event.inputBuffer.getChannelData(0);
          const fingerprint = Array.from(buffer.slice(0, 30))
            .map(x => x.toString(36))
            .join('');
          
          oscillator.stop();
          audioContext.close();
          resolve(fingerprint);
        };
      });
    } catch (error) {
      return '';
    }
  }

  /**
   * Detect available fonts
   */
  private async detectFonts(): Promise<string[]> {
    const baseFonts = [
      'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold',
      'Calibri', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS',
      'Consolas', 'Courier New', 'Franklin Gothic Medium', 'Gadget',
      'Georgia', 'Helvetica', 'Impact', 'Lucida Console', 'Lucida Sans Unicode',
      'Microsoft Sans Serif', 'Palatino Linotype', 'Segoe UI', 'Tahoma',
      'Times New Roman', 'Trebuchet MS', 'Verdana'
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const availableFonts: string[] = [];
    const testString = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const testSize = '72px';

    // Test each font
    for (const font of baseFonts) {
      ctx.font = `${testSize} ${font}`;
      const baselineWidth = ctx.measureText(testString).width;

      // Test with fallback font
      ctx.font = `${testSize} monospace`;
      const fallbackWidth = ctx.measureText(testString).width;

      if (baselineWidth !== fallbackWidth) {
        availableFonts.push(font);
      }
    }

    return availableFonts;
  }

  /**
   * Get browser plugins
   */
  private getPlugins(): string[] {
    const plugins: string[] = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      plugins.push(navigator.plugins[i].name);
    }
    return plugins;
  }

  /**
   * Test storage availability
   */
  private testStorage(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test IndexedDB availability
   */
  private testIndexedDB(): boolean {
    try {
      return 'indexedDB' in window;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test WebRTC availability
   */
  private testWebRTC(): boolean {
    try {
      return !!(window.RTCPeerConnection || (window as any).mozRTCPeerConnection || (window as any).webkitRTCPeerConnection);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate hash from fingerprint
   */
  private async generateHash(fingerprint: BrowserFingerprint): Promise<string> {
    const fingerprintString = JSON.stringify(fingerprint, null, 0);
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    const fingerprint = await this.generateFingerprint();
    
    // Parse user agent for device info
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*\bMobile\b)/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;

    // Detect browser
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome';
      browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Safari')) {
      browserName = 'Safari';
      browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Edge')) {
      browserName = 'Edge';
      browserVersion = userAgent.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
    }

    // Detect OS
    let osName = 'Unknown';
    let osVersion = 'Unknown';
    if (userAgent.includes('Windows')) {
      osName = 'Windows';
      if (userAgent.includes('Windows NT 10.0')) osVersion = '10';
      else if (userAgent.includes('Windows NT 6.3')) osVersion = '8.1';
      else if (userAgent.includes('Windows NT 6.2')) osVersion = '8';
      else if (userAgent.includes('Windows NT 6.1')) osVersion = '7';
    } else if (userAgent.includes('Mac OS X')) {
      osName = 'macOS';
      osVersion = userAgent.match(/Mac OS X (\d+[._]\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Linux')) {
      osName = 'Linux';
    } else if (userAgent.includes('Android')) {
      osName = 'Android';
      osVersion = userAgent.match(/Android (\d+[.\d]*)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('iOS')) {
      osName = 'iOS';
      osVersion = userAgent.match(/OS (\d+[._]\d+)/)?.[1] || 'Unknown';
    }

    const deviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
    const deviceId = fingerprint.hash.substring(0, 16);

    return {
      deviceId,
      fingerprint,
      isMobile,
      isTablet,
      isDesktop,
      browserName,
      browserVersion,
      osName,
      osVersion,
      deviceType,
    };
  }

  /**
   * Validate device consistency
   */
  async validateDeviceConsistency(storedFingerprint: BrowserFingerprint): Promise<{
    isValid: boolean;
    confidence: number;
    differences: string[];
  }> {
    const currentFingerprint = await this.generateFingerprint();
    const differences: string[] = [];
    let confidence = 100;

    // Compare critical fingerprint elements
    const criticalFields: (keyof BrowserFingerprint)[] = [
      'userAgent', 'platform', 'screenResolution', 'timezone',
      'colorDepth', 'pixelRatio', 'hardwareConcurrency'
    ];

    for (const field of criticalFields) {
      if (currentFingerprint[field] !== storedFingerprint[field]) {
        differences.push(field);
        confidence -= 15; // Each difference reduces confidence
      }
    }

    // Compare canvas fingerprint (more lenient)
    if (currentFingerprint.canvasFingerprint !== storedFingerprint.canvasFingerprint) {
      differences.push('canvasFingerprint');
      confidence -= 10;
    }

    // Compare WebGL fingerprint (more lenient)
    if (currentFingerprint.webglFingerprint !== storedFingerprint.webglFingerprint) {
      differences.push('webglFingerprint');
      confidence -= 10;
    }

    // Compare fonts (partial match)
    const currentFonts = new Set(currentFingerprint.fonts);
    const storedFonts = new Set(storedFingerprint.fonts);
    const fontSimilarity = this.calculateSetSimilarity(currentFonts, storedFonts);
    if (fontSimilarity < 0.8) {
      differences.push('fonts');
      confidence -= 5;
    }

    const isValid = confidence >= 70; // Minimum confidence threshold

    return {
      isValid,
      confidence: Math.max(0, confidence),
      differences,
    };
  }

  /**
   * Calculate similarity between two sets
   */
  private calculateSetSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  /**
   * Clear cached fingerprint
   */
  clearCache(): void {
    this.cachedFingerprint = null;
  }
}

export const fingerprintService = FingerprintService.getInstance();
export default fingerprintService;
