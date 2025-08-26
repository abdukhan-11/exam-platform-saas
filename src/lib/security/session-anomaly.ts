/**
 * Session Anomaly Detection System
 * 
 * This module provides comprehensive session anomaly detection
 * for identifying suspicious login patterns and security violations.
 */

export interface SessionEvent {
  id: string;
  userId: string;
  sessionId: string;
  eventType: 'login' | 'logout' | 'page_view' | 'api_call' | 'security_check';
  timestamp: number;
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
    lat: number;
    lon: number;
  };
  deviceFingerprint?: string;
  metadata: Record<string, any>;
}

export interface AnomalyPattern {
  id: string;
  type: 'multiple_sessions' | 'rapid_location_change' | 'unusual_timing' | 'device_mismatch' | 'suspicious_behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number;
  detectedAt: number;
  userId: string;
  sessionId: string;
  details: Record<string, any>;
}

export interface SessionAnalysis {
  userId: string;
  sessionId: string;
  isAnomalous: boolean;
  riskScore: number;
  detectedPatterns: AnomalyPattern[];
  sessionMetrics: {
    totalEvents: number;
    uniqueIPs: number;
    uniqueDevices: number;
    locationChanges: number;
    timeSpan: number; // in minutes
    averageEventInterval: number; // in seconds
  };
  recommendations: string[];
  lastAnalyzed: number;
}

class SessionAnomalyService {
  private static instance: SessionAnomalyService;
  private sessionEvents: Map<string, SessionEvent[]> = new Map();
  private anomalyPatterns: AnomalyPattern[] = [];
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> Set of sessionIds
  private sessionStartTimes: Map<string, number> = new Map();

  static getInstance(): SessionAnomalyService {
    if (!SessionAnomalyService.instance) {
      SessionAnomalyService.instance = new SessionAnomalyService();
    }
    return SessionAnomalyService.instance;
  }

  /**
   * Record a session event
   */
  recordEvent(event: Omit<SessionEvent, 'id' | 'timestamp'>): void {
    const sessionEvent: SessionEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
    };

    const sessionKey = `${event.userId}_${event.sessionId}`;
    if (!this.sessionEvents.has(sessionKey)) {
      this.sessionEvents.set(sessionKey, []);
    }

    this.sessionEvents.get(sessionKey)!.push(sessionEvent);

    // Track user sessions
    if (!this.userSessions.has(event.userId)) {
      this.userSessions.set(event.userId, new Set());
    }
    this.userSessions.get(event.userId)!.add(event.sessionId);

    // Track session start time
    if (event.eventType === 'login' && !this.sessionStartTimes.has(event.sessionId)) {
      this.sessionStartTimes.set(event.sessionId, sessionEvent.timestamp);
    }

    // Keep only last 1000 events per session
    const events = this.sessionEvents.get(sessionKey)!;
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
  }

  /**
   * Analyze session for anomalies
   */
  async analyzeSession(userId: string, sessionId: string): Promise<SessionAnalysis> {
    const sessionKey = `${userId}_${sessionId}`;
    const events = this.sessionEvents.get(sessionKey) || [];
    
    if (events.length === 0) {
      return {
        userId,
        sessionId,
        isAnomalous: false,
        riskScore: 0,
        detectedPatterns: [],
        sessionMetrics: {
          totalEvents: 0,
          uniqueIPs: 0,
          uniqueDevices: 0,
          locationChanges: 0,
          timeSpan: 0,
          averageEventInterval: 0,
        },
        recommendations: [],
        lastAnalyzed: Date.now(),
      };
    }

    // Calculate session metrics
    const sessionMetrics = this.calculateSessionMetrics(events);
    
    // Detect anomaly patterns
    const detectedPatterns = await this.detectAnomalyPatterns(userId, sessionId, events, sessionMetrics);
    
    // Calculate risk score
    const riskScore = this.calculateRiskScore(detectedPatterns, sessionMetrics);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(detectedPatterns, sessionMetrics);
    
    const isAnomalous = riskScore > 50 || detectedPatterns.some(p => p.severity === 'high' || p.severity === 'critical');

    return {
      userId,
      sessionId,
      isAnomalous,
      riskScore,
      detectedPatterns,
      sessionMetrics,
      recommendations,
      lastAnalyzed: Date.now(),
    };
  }

  /**
   * Calculate session metrics
   */
  private calculateSessionMetrics(events: SessionEvent[]): SessionAnalysis['sessionMetrics'] {
    const uniqueIPs = new Set(events.map(e => e.ipAddress)).size;
    const uniqueDevices = new Set(events.map(e => e.deviceFingerprint).filter(Boolean)).size;
    
    // Calculate location changes
    const locations = events
      .filter(e => e.location)
      .map(e => `${e.location!.lat},${e.location!.lon}`);
    const uniqueLocations = new Set(locations);
    const locationChanges = Math.max(0, uniqueLocations.size - 1);
    
    // Calculate time span
    const timestamps = events.map(e => e.timestamp);
    const timeSpan = timestamps.length > 1 
      ? (Math.max(...timestamps) - Math.min(...timestamps)) / (1000 * 60) // in minutes
      : 0;
    
    // Calculate average event interval
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    const averageEventInterval = intervals.length > 0 
      ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length / 1000 // in seconds
      : 0;

    return {
      totalEvents: events.length,
      uniqueIPs,
      uniqueDevices,
      locationChanges,
      timeSpan,
      averageEventInterval,
    };
  }

  /**
   * Detect anomaly patterns
   */
  private async detectAnomalyPatterns(
    userId: string,
    sessionId: string,
    events: SessionEvent[],
    metrics: SessionAnalysis['sessionMetrics']
  ): Promise<AnomalyPattern[]> {
    const patterns: AnomalyPattern[] = [];

    // Check for multiple concurrent sessions
    const multipleSessionsPattern = this.detectMultipleSessions(userId, sessionId);
    if (multipleSessionsPattern) {
      patterns.push(multipleSessionsPattern);
    }

    // Check for rapid location changes
    const locationChangePattern = this.detectRapidLocationChange(events);
    if (locationChangePattern) {
      patterns.push(locationChangePattern);
    }

    // Check for unusual timing patterns
    const timingPattern = this.detectUnusualTiming(events, metrics);
    if (timingPattern) {
      patterns.push(timingPattern);
    }

    // Check for device fingerprint mismatches
    const devicePattern = this.detectDeviceMismatch(events);
    if (devicePattern) {
      patterns.push(devicePattern);
    }

    // Check for suspicious behavior patterns
    const behaviorPattern = this.detectSuspiciousBehavior(events, metrics);
    if (behaviorPattern) {
      patterns.push(behaviorPattern);
    }

    return patterns;
  }

  /**
   * Detect multiple concurrent sessions
   */
  private detectMultipleSessions(userId: string, currentSessionId: string): AnomalyPattern | null {
    const userSessions = this.userSessions.get(userId);
    if (!userSessions || userSessions.size <= 1) {
      return null;
    }

    const currentSessionStart = this.sessionStartTimes.get(currentSessionId);
    if (!currentSessionStart) {
      return null;
    }

    // Check for other active sessions within the last hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const activeSessions = Array.from(userSessions).filter(sessionId => {
      const sessionStart = this.sessionStartTimes.get(sessionId);
      return sessionId !== currentSessionId && sessionStart && sessionStart > oneHourAgo;
    });

    if (activeSessions.length > 0) {
      return {
        id: this.generatePatternId(),
        type: 'multiple_sessions',
        severity: activeSessions.length > 2 ? 'high' : 'medium',
        description: `Multiple concurrent sessions detected (${activeSessions.length + 1} total)`,
        confidence: 85,
        detectedAt: Date.now(),
        userId,
        sessionId: currentSessionId,
        details: {
          activeSessions: activeSessions.length,
          sessionIds: [currentSessionId, ...activeSessions],
        },
      };
    }

    return null;
  }

  /**
   * Detect rapid location changes
   */
  private detectRapidLocationChange(events: SessionEvent[]): AnomalyPattern | null {
    const locationEvents = events.filter(e => e.location);
    if (locationEvents.length < 2) {
      return null;
    }

    // Check for location changes within short time intervals
    const suspiciousChanges = [];
    for (let i = 1; i < locationEvents.length; i++) {
      const prev = locationEvents[i - 1];
      const curr = locationEvents[i];
      const timeDiff = curr.timestamp - prev.timestamp;
      const distance = this.calculateDistance(
        prev.location!.lat, prev.location!.lon,
        curr.location!.lat, curr.location!.lon
      );

      // If location changed more than 1000km within 10 minutes, it's suspicious
      if (distance > 1000 && timeDiff < 10 * 60 * 1000) {
        suspiciousChanges.push({
          from: `${prev.location!.city}, ${prev.location!.country}`,
          to: `${curr.location!.city}, ${curr.location!.country}`,
          distance: Math.round(distance),
          timeDiff: Math.round(timeDiff / 1000 / 60), // in minutes
        });
      }
    }

    if (suspiciousChanges.length > 0) {
      return {
        id: this.generatePatternId(),
        type: 'rapid_location_change',
        severity: suspiciousChanges.length > 2 ? 'critical' : 'high',
        description: `Rapid location changes detected (${suspiciousChanges.length} changes)`,
        confidence: 90,
        detectedAt: Date.now(),
        userId: events[0].userId,
        sessionId: events[0].sessionId,
        details: {
          changes: suspiciousChanges,
          totalChanges: suspiciousChanges.length,
        },
      };
    }

    return null;
  }

  /**
   * Detect unusual timing patterns
   */
  private detectUnusualTiming(events: SessionEvent[], metrics: SessionAnalysis['sessionMetrics']): AnomalyPattern | null {
    const flags = [];

    // Check for unusually high event frequency
    if (metrics.averageEventInterval < 1) { // Less than 1 second between events
      flags.push('high_frequency');
    }

    // Check for unusually long session duration
    if (metrics.timeSpan > 8 * 60) { // More than 8 hours
      flags.push('long_duration');
    }

    // Check for unusual time of day (e.g., 2-5 AM)
    const loginEvents = events.filter(e => e.eventType === 'login');
    if (loginEvents.length > 0) {
      const loginTime = new Date(loginEvents[0].timestamp);
      const hour = loginTime.getHours();
      if (hour >= 2 && hour <= 5) {
        flags.push('unusual_hour');
      }
    }

    if (flags.length > 0) {
      return {
        id: this.generatePatternId(),
        type: 'unusual_timing',
        severity: flags.includes('high_frequency') ? 'high' : 'medium',
        description: `Unusual timing patterns detected: ${flags.join(', ')}`,
        confidence: 70,
        detectedAt: Date.now(),
        userId: events[0].userId,
        sessionId: events[0].sessionId,
        details: {
          flags,
          averageInterval: metrics.averageEventInterval,
          sessionDuration: metrics.timeSpan,
        },
      };
    }

    return null;
  }

  /**
   * Detect device fingerprint mismatches
   */
  private detectDeviceMismatch(events: SessionEvent[]): AnomalyPattern | null {
    const deviceFingerprints = events
      .map(e => e.deviceFingerprint)
      .filter(Boolean);
    
    if (deviceFingerprints.length < 2) {
      return null;
    }

    const uniqueDevices = new Set(deviceFingerprints);
    if (uniqueDevices.size > 1) {
      return {
        id: this.generatePatternId(),
        type: 'device_mismatch',
        severity: uniqueDevices.size > 2 ? 'high' : 'medium',
        description: `Multiple device fingerprints detected (${uniqueDevices.size} devices)`,
        confidence: 80,
        detectedAt: Date.now(),
        userId: events[0].userId,
        sessionId: events[0].sessionId,
        details: {
          uniqueDevices: uniqueDevices.size,
          deviceFingerprints: Array.from(uniqueDevices),
        },
      };
    }

    return null;
  }

  /**
   * Detect suspicious behavior patterns
   */
  private detectSuspiciousBehavior(events: SessionEvent[], metrics: SessionAnalysis['sessionMetrics']): AnomalyPattern | null {
    const flags = [];

    // Check for excessive API calls
    const apiCalls = events.filter(e => e.eventType === 'api_call').length;
    if (apiCalls > 100) { // More than 100 API calls
      flags.push('excessive_api_calls');
    }

    // Check for rapid page views
    const pageViews = events.filter(e => e.eventType === 'page_view');
    if (pageViews.length > 50) { // More than 50 page views
      flags.push('rapid_navigation');
    }

    // Check for multiple IP addresses
    if (metrics.uniqueIPs > 3) {
      flags.push('multiple_ips');
    }

    // Check for bot-like behavior (very regular intervals)
    if (metrics.averageEventInterval > 0 && metrics.averageEventInterval < 2) {
      const intervals = [];
      for (let i = 1; i < events.length; i++) {
        intervals.push(events[i].timestamp - events[i - 1].timestamp);
      }
      
      const variance = this.calculateVariance(intervals);
      if (variance < 1000) { // Very low variance (bot-like)
        flags.push('bot_behavior');
      }
    }

    if (flags.length > 0) {
      return {
        id: this.generatePatternId(),
        type: 'suspicious_behavior',
        severity: flags.includes('bot_behavior') || flags.includes('excessive_api_calls') ? 'high' : 'medium',
        description: `Suspicious behavior patterns detected: ${flags.join(', ')}`,
        confidence: 75,
        detectedAt: Date.now(),
        userId: events[0].userId,
        sessionId: events[0].sessionId,
        details: {
          flags,
          apiCalls,
          pageViews: pageViews.length,
          uniqueIPs: metrics.uniqueIPs,
        },
      };
    }

    return null;
  }

  /**
   * Calculate risk score based on detected patterns
   */
  private calculateRiskScore(patterns: AnomalyPattern[], metrics: SessionAnalysis['sessionMetrics']): number {
    let score = 0;

    // Base score from patterns
    for (const pattern of patterns) {
      switch (pattern.severity) {
        case 'critical':
          score += 40;
          break;
        case 'high':
          score += 25;
          break;
        case 'medium':
          score += 15;
          break;
        case 'low':
          score += 5;
          break;
      }
    }

    // Additional scoring based on metrics
    if (metrics.uniqueIPs > 2) score += 10;
    if (metrics.uniqueDevices > 1) score += 15;
    if (metrics.locationChanges > 2) score += 20;
    if (metrics.averageEventInterval < 1) score += 15;

    return Math.min(100, score);
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(patterns: AnomalyPattern[], metrics: SessionAnalysis['sessionMetrics']): string[] {
    const recommendations: string[] = [];

    if (patterns.some(p => p.type === 'multiple_sessions')) {
      recommendations.push('Consider implementing session limits or requiring re-authentication');
    }

    if (patterns.some(p => p.type === 'rapid_location_change')) {
      recommendations.push('Verify user identity and consider additional authentication');
    }

    if (patterns.some(p => p.type === 'device_mismatch')) {
      recommendations.push('Require device verification or additional security checks');
    }

    if (patterns.some(p => p.type === 'suspicious_behavior')) {
      recommendations.push('Monitor user activity and consider rate limiting');
    }

    if (metrics.uniqueIPs > 2) {
      recommendations.push('Review IP address changes and consider geo-blocking if necessary');
    }

    if (metrics.averageEventInterval < 1) {
      recommendations.push('Implement rate limiting to prevent automated attacks');
    }

    return recommendations;
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
   * Calculate variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate unique pattern ID
   */
  private generatePatternId(): string {
    return 'pattern_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get session events for a user
   */
  getSessionEvents(userId: string, sessionId?: string): SessionEvent[] {
    if (sessionId) {
      const sessionKey = `${userId}_${sessionId}`;
      return this.sessionEvents.get(sessionKey) || [];
    }

    // Get all events for user across all sessions
    const allEvents: SessionEvent[] = [];
    for (const [key, events] of this.sessionEvents.entries()) {
      if (key.startsWith(`${userId}_`)) {
        allEvents.push(...events);
      }
    }

    return allEvents.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get anomaly patterns for a user
   */
  getAnomalyPatterns(userId: string, limit: number = 50): AnomalyPattern[] {
    return this.anomalyPatterns
      .filter(pattern => pattern.userId === userId)
      .sort((a, b) => b.detectedAt - a.detectedAt)
      .slice(0, limit);
  }

  /**
   * Clear old data
   */
  clearOldData(olderThanDays: number = 30): void {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    // Clear old events
    for (const [key, events] of this.sessionEvents.entries()) {
      const filteredEvents = events.filter(event => event.timestamp > cutoffTime);
      if (filteredEvents.length === 0) {
        this.sessionEvents.delete(key);
      } else {
        this.sessionEvents.set(key, filteredEvents);
      }
    }

    // Clear old patterns
    this.anomalyPatterns = this.anomalyPatterns.filter(pattern => pattern.detectedAt > cutoffTime);

    // Clear old session start times
    for (const [sessionId, startTime] of this.sessionStartTimes.entries()) {
      if (startTime < cutoffTime) {
        this.sessionStartTimes.delete(sessionId);
      }
    }
  }
}

export const sessionAnomalyService = SessionAnomalyService.getInstance();
export default sessionAnomalyService;
