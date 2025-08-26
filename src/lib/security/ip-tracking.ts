/**
 * IP Tracking and Geolocation Security System
 * 
 * This module provides IP address tracking, geolocation validation,
 * and VPN/proxy detection for enhanced security.
 */

export interface IPInfo {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
  status: string;
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  riskScore: number;
  timestamp: number;
}

export interface GeolocationSecurity {
  currentLocation: IPInfo;
  previousLocations: IPInfo[];
  isLocationConsistent: boolean;
  isVpnDetected: boolean;
  isProxyDetected: boolean;
  isTorDetected: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  securityFlags: string[];
  lastUpdated: number;
}

export interface SecurityAlert {
  id: string;
  type: 'vpn_detected' | 'proxy_detected' | 'tor_detected' | 'location_change' | 'suspicious_ip';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

class IPTrackingService {
  private static instance: IPTrackingService;
  private ipCache: Map<string, IPInfo> = new Map();
  private locationHistory: Map<string, IPInfo[]> = new Map();
  private securityAlerts: SecurityAlert[] = [];

  static getInstance(): IPTrackingService {
    if (!IPTrackingService.instance) {
      IPTrackingService.instance = new IPTrackingService();
    }
    return IPTrackingService.instance;
  }

  /**
   * Get current IP information
   */
  async getCurrentIPInfo(): Promise<IPInfo> {
    try {
      // Try multiple IP services for reliability
      const ipServices = [
        'https://ipapi.co/json/',
        'https://ip-api.com/json/',
        'https://api.ipify.org?format=json',
      ];

      for (const service of ipServices) {
        try {
          const response = await fetch(service, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            const ipInfo = this.parseIPResponse(data, service);
            
            // Check for VPN/Proxy/Tor
            const securityInfo = await this.checkIPSecurity(ipInfo.ip);
            ipInfo.isVpn = securityInfo.isVpn;
            ipInfo.isProxy = securityInfo.isProxy;
            ipInfo.isTor = securityInfo.isTor;
            ipInfo.riskScore = this.calculateRiskScore(ipInfo, securityInfo);
            
            this.ipCache.set(ipInfo.ip, ipInfo);
            return ipInfo;
          }
        } catch (error) {
          console.warn(`Failed to get IP info from ${service}:`, error);
          continue;
        }
      }

      throw new Error('All IP services failed');
    } catch (error) {
      console.error('Failed to get IP information:', error);
      throw error;
    }
  }

  /**
   * Parse IP response from different services
   */
  private parseIPResponse(data: any, service: string): IPInfo {
    const timestamp = Date.now();

    if (service.includes('ipapi.co')) {
      return {
        ip: data.ip,
        country: data.country_name || '',
        countryCode: data.country_code || '',
        region: data.region || '',
        regionName: data.region || '',
        city: data.city || '',
        zip: data.postal || '',
        lat: data.latitude || 0,
        lon: data.longitude || 0,
        timezone: data.timezone || '',
        isp: data.org || '',
        org: data.org || '',
        as: data.asn || '',
        query: data.ip,
        status: 'success',
        isVpn: false,
        isProxy: false,
        isTor: false,
        riskScore: 0,
        timestamp,
      };
    } else if (service.includes('ip-api.com')) {
      return {
        ip: data.query,
        country: data.country || '',
        countryCode: data.countryCode || '',
        region: data.region || '',
        regionName: data.regionName || '',
        city: data.city || '',
        zip: data.zip || '',
        lat: data.lat || 0,
        lon: data.lon || 0,
        timezone: data.timezone || '',
        isp: data.isp || '',
        org: data.org || '',
        as: data.as || '',
        query: data.query,
        status: data.status,
        isVpn: false,
        isProxy: false,
        isTor: false,
        riskScore: 0,
        timestamp,
      };
    } else {
      // Fallback for ipify or other services
      return {
        ip: data.ip || data,
        country: '',
        countryCode: '',
        region: '',
        regionName: '',
        city: '',
        zip: '',
        lat: 0,
        lon: 0,
        timezone: '',
        isp: '',
        org: '',
        as: '',
        query: data.ip || data,
        status: 'success',
        isVpn: false,
        isProxy: false,
        isTor: false,
        riskScore: 0,
        timestamp,
      };
    }
  }

  /**
   * Check IP security (VPN/Proxy/Tor detection)
   */
  private async checkIPSecurity(ip: string): Promise<{
    isVpn: boolean;
    isProxy: boolean;
    isTor: boolean;
  }> {
    try {
      // Use multiple services for VPN/Proxy detection
      const securityChecks = await Promise.allSettled([
        this.checkVPNProxy(ip),
        this.checkTor(ip),
      ]);

      const vpnProxyResult = securityChecks[0].status === 'fulfilled' ? securityChecks[0].value : { isVpn: false, isProxy: false };
      const torResult = securityChecks[1].status === 'fulfilled' ? securityChecks[1].value : { isTor: false };

      return {
        isVpn: vpnProxyResult.isVpn,
        isProxy: vpnProxyResult.isProxy,
        isTor: torResult.isTor,
      };
    } catch (error) {
      console.error('Failed to check IP security:', error);
      return { isVpn: false, isProxy: false, isTor: false };
    }
  }

  /**
   * Check for VPN/Proxy using IPQualityScore or similar service
   */
  private async checkVPNProxy(ip: string): Promise<{ isVpn: boolean; isProxy: boolean }> {
    try {
      // Using a free service for demonstration
      // In production, you might want to use a paid service like IPQualityScore
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      const data = await response.json();

      // Basic heuristics for VPN/Proxy detection
      const isVpn = this.isLikelyVPN(data);
      const isProxy = this.isLikelyProxy(data);

      return { isVpn, isProxy };
    } catch (error) {
      console.error('Failed to check VPN/Proxy:', error);
      return { isVpn: false, isProxy: false };
    }
  }

  /**
   * Check for Tor exit nodes
   */
  private async checkTor(ip: string): Promise<{ isTor: boolean }> {
    try {
      // Check against known Tor exit nodes
      const response = await fetch(`https://check.torproject.org/api/ip`);
      const data = await response.json();
      
      return { isTor: data.IsTor || false };
    } catch (error) {
      // Fallback: check against a list of known Tor exit nodes
      const knownTorIPs = await this.getKnownTorIPs();
      return { isTor: knownTorIPs.includes(ip) };
    }
  }

  /**
   * Get known Tor exit nodes (simplified version)
   */
  private async getKnownTorIPs(): Promise<string[]> {
    // In a real implementation, you would fetch this from a reliable source
    // For now, return an empty array
    return [];
  }

  /**
   * Heuristic VPN detection
   */
  private isLikelyVPN(data: any): boolean {
    const vpnIndicators = [
      'vpn', 'proxy', 'hosting', 'datacenter', 'cloud',
      'amazon', 'google', 'microsoft', 'digitalocean', 'linode'
    ];

    const org = (data.org || '').toLowerCase();
    const isp = (data.isp || '').toLowerCase();

    return vpnIndicators.some(indicator => 
      org.includes(indicator) || isp.includes(indicator)
    );
  }

  /**
   * Heuristic Proxy detection
   */
  private isLikelyProxy(data: any): boolean {
    const proxyIndicators = [
      'proxy', 'anonymizer', 'tunnel', 'relay'
    ];

    const org = (data.org || '').toLowerCase();
    const isp = (data.isp || '').toLowerCase();

    return proxyIndicators.some(indicator => 
      org.includes(indicator) || isp.includes(indicator)
    );
  }

  /**
   * Calculate risk score based on IP information
   */
  private calculateRiskScore(ipInfo: IPInfo, securityInfo: any): number {
    let score = 0;

    // VPN detection
    if (securityInfo.isVpn) score += 30;
    
    // Proxy detection
    if (securityInfo.isProxy) score += 25;
    
    // Tor detection
    if (securityInfo.isTor) score += 40;

    // High-risk countries (example list)
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR'];
    if (highRiskCountries.includes(ipInfo.countryCode)) {
      score += 20;
    }

    // Datacenter/hosting providers
    const hostingProviders = ['amazon', 'google', 'microsoft', 'digitalocean', 'linode', 'vultr'];
    const org = ipInfo.org.toLowerCase();
    if (hostingProviders.some(provider => org.includes(provider))) {
      score += 15;
    }

    return Math.min(100, score);
  }

  /**
   * Track location changes and generate security alerts
   */
  async trackLocationChange(userId: string, sessionId: string): Promise<GeolocationSecurity> {
    const currentIP = await this.getCurrentIPInfo();
    const previousLocations = this.locationHistory.get(userId) || [];
    
    // Add current location to history
    previousLocations.push(currentIP);
    
    // Keep only last 10 locations
    if (previousLocations.length > 10) {
      previousLocations.shift();
    }
    
    this.locationHistory.set(userId, previousLocations);

    // Analyze location consistency
    const isLocationConsistent = this.analyzeLocationConsistency(previousLocations);
    
    // Generate security assessment
    const securityFlags: string[] = [];
    if (currentIP.isVpn) securityFlags.push('vpn_detected');
    if (currentIP.isProxy) securityFlags.push('proxy_detected');
    if (currentIP.isTor) securityFlags.push('tor_detected');
    if (!isLocationConsistent) securityFlags.push('location_inconsistent');
    if (currentIP.riskScore > 50) securityFlags.push('high_risk_ip');

    const riskLevel = this.determineRiskLevel(currentIP, isLocationConsistent, securityFlags);

    // Generate alerts for suspicious activity
    await this.generateSecurityAlerts(userId, sessionId, currentIP, previousLocations, securityFlags);

    return {
      currentLocation: currentIP,
      previousLocations,
      isLocationConsistent,
      isVpnDetected: currentIP.isVpn,
      isProxyDetected: currentIP.isProxy,
      isTorDetected: currentIP.isTor,
      riskLevel,
      securityFlags,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Analyze location consistency
   */
  private analyzeLocationConsistency(locations: IPInfo[]): boolean {
    if (locations.length < 2) return true;

    const recentLocations = locations.slice(-3); // Check last 3 locations
    const countries = new Set(recentLocations.map(loc => loc.countryCode));
    
    // If more than one country in recent locations, it's inconsistent
    if (countries.size > 1) return false;

    // Check for significant distance changes
    for (let i = 1; i < recentLocations.length; i++) {
      const distance = this.calculateDistance(
        recentLocations[i-1].lat, recentLocations[i-1].lon,
        recentLocations[i].lat, recentLocations[i].lon
      );
      
      // If distance is more than 1000km, it's suspicious
      if (distance > 1000) return false;
    }

    return true;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Determine risk level
   */
  private determineRiskLevel(
    currentIP: IPInfo, 
    isLocationConsistent: boolean, 
    securityFlags: string[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (currentIP.isTor || securityFlags.includes('tor_detected')) {
      return 'critical';
    }
    
    if (currentIP.isVpn || currentIP.isProxy || !isLocationConsistent) {
      return 'high';
    }
    
    if (currentIP.riskScore > 30 || securityFlags.length > 0) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Generate security alerts
   */
  private async generateSecurityAlerts(
    userId: string,
    sessionId: string,
    currentIP: IPInfo,
    previousLocations: IPInfo[],
    securityFlags: string[]
  ): Promise<void> {
    const alerts: SecurityAlert[] = [];

    // VPN detection alert
    if (currentIP.isVpn) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'vpn_detected',
        severity: 'high',
        message: 'VPN connection detected',
        details: { ip: currentIP.ip, org: currentIP.org },
        timestamp: Date.now(),
        userId,
        sessionId,
      });
    }

    // Proxy detection alert
    if (currentIP.isProxy) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'proxy_detected',
        severity: 'high',
        message: 'Proxy connection detected',
        details: { ip: currentIP.ip, org: currentIP.org },
        timestamp: Date.now(),
        userId,
        sessionId,
      });
    }

    // Tor detection alert
    if (currentIP.isTor) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'tor_detected',
        severity: 'critical',
        message: 'Tor network connection detected',
        details: { ip: currentIP.ip },
        timestamp: Date.now(),
        userId,
        sessionId,
      });
    }

    // Location change alert
    if (previousLocations.length > 1) {
      const lastLocation = previousLocations[previousLocations.length - 2];
      const distance = this.calculateDistance(
        lastLocation.lat, lastLocation.lon,
        currentIP.lat, currentIP.lon
      );

      if (distance > 1000) { // More than 1000km
        alerts.push({
          id: this.generateAlertId(),
          type: 'location_change',
          severity: 'medium',
          message: 'Significant location change detected',
          details: { 
            previousLocation: lastLocation.city + ', ' + lastLocation.country,
            currentLocation: currentIP.city + ', ' + currentIP.country,
            distance: Math.round(distance) + 'km'
          },
          timestamp: Date.now(),
          userId,
          sessionId,
        });
      }
    }

    // Add alerts to the list
    this.securityAlerts.push(...alerts);

    // Keep only last 1000 alerts
    if (this.securityAlerts.length > 1000) {
      this.securityAlerts = this.securityAlerts.slice(-1000);
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get security alerts for a user
   */
  getSecurityAlerts(userId?: string, limit: number = 50): SecurityAlert[] {
    let alerts = this.securityAlerts;
    
    if (userId) {
      alerts = alerts.filter(alert => alert.userId === userId);
    }
    
    return alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThanDays: number = 30): void {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    this.securityAlerts = this.securityAlerts.filter(alert => alert.timestamp > cutoffTime);
  }

  /**
   * Get location history for a user
   */
  getLocationHistory(userId: string): IPInfo[] {
    return this.locationHistory.get(userId) || [];
  }

  /**
   * Clear location history for a user
   */
  clearLocationHistory(userId: string): void {
    this.locationHistory.delete(userId);
  }
}

export const ipTrackingService = IPTrackingService.getInstance();
export default ipTrackingService;
