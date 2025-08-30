/**
 * Trend Analysis Engine
 *
 * This module provides advanced trend analysis capabilities for detecting repeat offenders,
 * coordinated cheating patterns, and suspicious behavior trends across exam sessions.
 * It uses statistical analysis, pattern recognition, and machine learning techniques
 * to identify anomalous behavior patterns.
 */

import { ExamSecurityEvent } from './exam-security';
import { SeverityHistory } from './severity-scoring';

export interface TrendPattern {
  id: string;
  type: 'repeat_offender' | 'coordinated_cheating' | 'suspicious_timing' | 'behavioral_anomaly' | 'network_anomaly';
  confidence: number; // 0-1
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  indicators: string[];
  affectedUsers: string[];
  timeWindow: {
    start: number;
    end: number;
  };
  statisticalData: {
    frequency: number;
    averageSeverity: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
    correlationCoefficient: number;
  };
  recommendations: string[];
  detectedAt: number;
}

export interface UserProfile {
  userId: string;
  riskScore: number;
  violationHistory: {
    totalViolations: number;
    violationTypes: Record<string, number>;
    averageSeverity: number;
    lastViolation: number;
    violationFrequency: number; // violations per day
  };
  behaviorPatterns: {
    commonTimes: number[]; // hours of day when violations occur
    commonDays: number[]; // days of week
    deviceConsistency: number; // 0-1, how consistent device usage is
    networkPatterns: string[];
  };
  riskFactors: {
    isRepeatOffender: boolean;
    coordinatedCheatingScore: number;
    accountAge: number;
    trustScore: number;
  };
  lastUpdated: number;
}

export interface CoordinationAnalysis {
  coordinationId: string;
  involvedUsers: string[];
  coordinationType: 'simultaneous_violations' | 'pattern_sharing' | 'communication_suspicion' | 'device_sharing';
  confidence: number;
  evidence: {
    timingCorrelation: number;
    patternSimilarity: number;
    networkCorrelation: number;
    behavioralSimilarity: number;
  };
  timeWindow: {
    start: number;
    end: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  detectedAt: number;
}

export interface TrendAnalysisConfig {
  analysisWindow: {
    short: number; // hours
    medium: number; // days
    long: number; // weeks
  };
  thresholds: {
    repeatOffender: {
      minViolations: number;
      timeWindow: number; // days
      severityThreshold: number;
    };
    coordinatedCheating: {
      minUsers: number;
      timingThreshold: number; // seconds
      patternSimilarityThreshold: number; // 0-1
    };
    suspiciousTiming: {
      clusterThreshold: number; // violations within time window
      timeWindow: number; // minutes
    };
  };
  statisticalParameters: {
    correlationThreshold: number; // 0-1
    trendSensitivity: number; // 0-1
    anomalyThreshold: number; // standard deviations
  };
  machineLearning: {
    enabled: boolean;
    modelUpdateInterval: number; // hours
    trainingDataSize: number;
    featureWeights: Record<string, number>;
  };
}

export interface TrendAnalysisResult {
  patterns: TrendPattern[];
  userProfiles: Map<string, UserProfile>;
  coordinationAnalyses: CoordinationAnalysis[];
  systemHealth: {
    analysisCoverage: number; // percentage of data analyzed
    falsePositiveRate: number;
    detectionAccuracy: number;
    processingTime: number; // milliseconds
  };
  recommendations: string[];
  generatedAt: number;
}

class TrendAnalysisEngine {
  private static instance: TrendAnalysisEngine;
  private config: TrendAnalysisConfig;
  private userProfiles: Map<string, UserProfile> = new Map();
  private trendPatterns: TrendPattern[] = [];
  private coordinationAnalyses: CoordinationAnalysis[] = [];
  private analysisCache: Map<string, { result: any; expires: number }> = new Map();
  private mlModel: any = null; // Would be a trained ML model in production

  private defaultConfig: TrendAnalysisConfig = {
    analysisWindow: {
      short: 24, // 24 hours
      medium: 7, // 7 days
      long: 30 // 30 days
    },
    thresholds: {
      repeatOffender: {
        minViolations: 3,
        timeWindow: 7, // 7 days
        severityThreshold: 30
      },
      coordinatedCheating: {
        minUsers: 2,
        timingThreshold: 30, // 30 seconds
        patternSimilarityThreshold: 0.7
      },
      suspiciousTiming: {
        clusterThreshold: 3,
        timeWindow: 10 // 10 minutes
      }
    },
    statisticalParameters: {
      correlationThreshold: 0.6,
      trendSensitivity: 0.5,
      anomalyThreshold: 2.0
    },
    machineLearning: {
      enabled: false, // Disabled by default, requires ML setup
      modelUpdateInterval: 24, // 24 hours
      trainingDataSize: 1000,
      featureWeights: {
        violationFrequency: 0.3,
        severityAverage: 0.25,
        timingPatterns: 0.2,
        deviceConsistency: 0.15,
        networkPatterns: 0.1
      }
    }
  };

  static getInstance(): TrendAnalysisEngine {
    if (!TrendAnalysisEngine.instance) {
      TrendAnalysisEngine.instance = new TrendAnalysisEngine();
    }
    return TrendAnalysisEngine.instance;
  }

  constructor() {
    this.config = { ...this.defaultConfig };
    this.initializeEngine();
  }

  /**
   * Initialize the trend analysis engine
   */
  private initializeEngine(): void {
    // Set up periodic analysis
    setInterval(() => {
      this.performPeriodicAnalysis();
    }, 30 * 60 * 1000); // Every 30 minutes

    // Set up data cleanup
    setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Analyze user behavior trends
   */
  async analyzeUserTrends(
    userId: string,
    violationHistory: ExamSecurityEvent[],
    timeWindow: number = 7 * 24 * 60 * 60 * 1000 // 7 days
  ): Promise<UserProfile> {
    const cacheKey = `user_trends_${userId}_${timeWindow}`;
    const cached = this.analysisCache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }

    const cutoffTime = Date.now() - timeWindow;
    const relevantViolations = violationHistory.filter(v => v.timestamp > cutoffTime);

    const profile: UserProfile = {
      userId,
      riskScore: 0,
      violationHistory: {
        totalViolations: relevantViolations.length,
        violationTypes: this.countViolationTypes(relevantViolations),
        averageSeverity: this.calculateAverageSeverity(relevantViolations),
        lastViolation: relevantViolations.length > 0 ? Math.max(...relevantViolations.map(v => v.timestamp)) : 0,
        violationFrequency: relevantViolations.length / (timeWindow / (24 * 60 * 60 * 1000)) // per day
      },
      behaviorPatterns: {
        commonTimes: this.analyzeCommonTimes(relevantViolations),
        commonDays: this.analyzeCommonDays(relevantViolations),
        deviceConsistency: 0, // Would need device fingerprinting data
        networkPatterns: this.analyzeNetworkPatterns(relevantViolations)
      },
      riskFactors: {
        isRepeatOffender: this.isRepeatOffender(relevantViolations),
        coordinatedCheatingScore: 0, // Calculated separately
        accountAge: 0, // Would need user account data
        trustScore: 0 // Would need trust scoring system
      },
      lastUpdated: Date.now()
    };

    // Calculate risk score
    profile.riskScore = this.calculateUserRiskScore(profile);

    // Cache the result
    this.analysisCache.set(cacheKey, {
      result: profile,
      expires: Date.now() + (60 * 60 * 1000) // Cache for 1 hour
    });

    // Store profile
    this.userProfiles.set(userId, profile);

    return profile;
  }

  /**
   * Detect repeat offenders
   */
  async detectRepeatOffenders(violations: ExamSecurityEvent[]): Promise<TrendPattern[]> {
    const patterns: TrendPattern[] = [];
    const userViolationMap = new Map<string, ExamSecurityEvent[]>();

    // Group violations by user
    violations.forEach(violation => {
      const userViolations = userViolationMap.get(violation.userId) || [];
      userViolations.push(violation);
      userViolationMap.set(violation.userId, userViolations);
    });

    // Analyze each user's violation pattern
    for (const [userId, userViolations] of userViolationMap.entries()) {
      const repeatPattern = await this.analyzeRepeatOffenderPattern(userId, userViolations);

      if (repeatPattern) {
        patterns.push(repeatPattern);
      }
    }

    return patterns;
  }

  /**
   * Analyze repeat offender pattern
   */
  private async analyzeRepeatOffenderPattern(
    userId: string,
    violations: ExamSecurityEvent[]
  ): Promise<TrendPattern | null> {
    const config = this.config.thresholds.repeatOffender;
    const timeWindow = config.timeWindow * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - timeWindow;

    const recentViolations = violations.filter(v => v.timestamp > cutoffTime);

    if (recentViolations.length < config.minViolations) {
      return null;
    }

    // Calculate severity trend
    const severityScores = recentViolations.map(v => {
      switch (v.severity) {
        case 'low': return 1;
        case 'medium': return 2;
        case 'high': return 3;
        case 'critical': return 4;
        default: return 1;
      }
    });

    const averageSeverity = severityScores.reduce((sum, score) => sum + score, 0) / severityScores.length;

    if (averageSeverity < config.severityThreshold / 10) { // Convert to 0-4 scale
      return null;
    }

    // Calculate frequency trend
    const violationTimes = recentViolations.map(v => v.timestamp).sort();
    let increasingTrend = 0;
    let decreasingTrend = 0;

    for (let i = 1; i < violationTimes.length; i++) {
      const timeDiff = violationTimes[i] - violationTimes[i-1];
      if (timeDiff < 24 * 60 * 60 * 1000) { // Less than 1 day apart
        increasingTrend++;
      } else if (timeDiff > 7 * 24 * 60 * 60 * 1000) { // More than 1 week apart
        decreasingTrend++;
      }
    }

    const trendDirection = increasingTrend > decreasingTrend ? 'increasing' : 'stable';
    const confidence = Math.min(0.9, recentViolations.length / 10);

    return {
      id: `repeat_offender_${userId}_${Date.now()}`,
      type: 'repeat_offender',
      confidence,
      severity: averageSeverity > 3 ? 'high' : averageSeverity > 2 ? 'medium' : 'low',
      description: `User ${userId} identified as repeat offender with ${recentViolations.length} violations in ${config.timeWindow} days`,
      indicators: [
        `${recentViolations.length} violations in ${config.timeWindow} days`,
        `Average severity: ${averageSeverity.toFixed(1)}`,
        `Trend: ${trendDirection}`
      ],
      affectedUsers: [userId],
      timeWindow: {
        start: cutoffTime,
        end: Date.now()
      },
      statisticalData: {
        frequency: recentViolations.length / config.timeWindow,
        averageSeverity,
        trendDirection: trendDirection as any,
        correlationCoefficient: this.calculateCorrelation(violationTimes, severityScores)
      },
      recommendations: [
        'Review user account for additional security measures',
        'Consider temporary suspension of exam privileges',
        'Notify academic integrity office',
        'Implement additional monitoring for this user'
      ],
      detectedAt: Date.now()
    };
  }

  /**
   * Detect coordinated cheating patterns
   */
  async detectCoordinatedCheating(allViolations: ExamSecurityEvent[]): Promise<CoordinationAnalysis[]> {
    const analyses: CoordinationAnalysis[] = [];
    const config = this.config.thresholds.coordinatedCheating;

    // Group violations by time windows
    const timeWindows = this.createTimeWindows(allViolations, 5 * 60 * 1000); // 5-minute windows

    for (const timeWindow of timeWindows) {
      const coordination = await this.analyzeTimeWindowCoordination(timeWindow.violations, timeWindow.start, timeWindow.end);

      if (coordination && coordination.confidence > config.patternSimilarityThreshold) {
        analyses.push(coordination);
      }
    }

    return analyses;
  }

  /**
   * Analyze coordination within a time window
   */
  private async analyzeTimeWindowCoordination(
    violations: ExamSecurityEvent[],
    windowStart: number,
    windowEnd: number
  ): Promise<CoordinationAnalysis | null> {
    if (violations.length < this.config.thresholds.coordinatedCheating.minUsers) {
      return null;
    }

    // Group by user
    const userGroups = new Map<string, ExamSecurityEvent[]>();
    violations.forEach(v => {
      const userViolations = userGroups.get(v.userId) || [];
      userViolations.push(v);
      userGroups.set(v.userId, userViolations);
    });

    if (userGroups.size < this.config.thresholds.coordinatedCheating.minUsers) {
      return null;
    }

    // Calculate coordination metrics
    const timingCorrelation = this.calculateTimingCorrelation(Array.from(userGroups.values()));
    const patternSimilarity = this.calculatePatternSimilarity(Array.from(userGroups.values()));
    const networkCorrelation = this.calculateNetworkCorrelation(violations);
    const behavioralSimilarity = this.calculateBehavioralSimilarity(Array.from(userGroups.values()));

    const evidence = {
      timingCorrelation,
      patternSimilarity,
      networkCorrelation,
      behavioralSimilarity
    };

    // Calculate overall confidence
    const confidence = (
      timingCorrelation * 0.3 +
      patternSimilarity * 0.3 +
      networkCorrelation * 0.2 +
      behavioralSimilarity * 0.2
    );

    if (confidence < this.config.thresholds.coordinatedCheating.patternSimilarityThreshold) {
      return null;
    }

    // Determine coordination type
    let coordinationType: CoordinationAnalysis['coordinationType'] = 'simultaneous_violations';
    if (patternSimilarity > 0.8) {
      coordinationType = 'pattern_sharing';
    } else if (networkCorrelation > 0.7) {
      coordinationType = 'device_sharing';
    }

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (confidence > 0.9) severity = 'critical';
    else if (confidence > 0.8) severity = 'high';
    else if (confidence > 0.7) severity = 'medium';

    return {
      coordinationId: `coordination_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      involvedUsers: Array.from(userGroups.keys()),
      coordinationType,
      confidence,
      evidence,
      timeWindow: {
        start: windowStart,
        end: windowEnd
      },
      severity,
      recommendations: [
        'Investigate involved users for academic integrity violation',
        'Review exam session recordings for the time window',
        'Consider invalidating exam results for involved users',
        'Implement additional security measures for future exams',
        'Notify academic integrity office for formal investigation'
      ],
      detectedAt: Date.now()
    };
  }

  /**
   * Create time windows for coordination analysis
   */
  private createTimeWindows(violations: ExamSecurityEvent[], windowSize: number): Array<{ start: number; end: number; violations: ExamSecurityEvent[] }> {
    const windows: Array<{ start: number; end: number; violations: ExamSecurityEvent[] }> = [];
    const sortedViolations = violations.sort((a, b) => a.timestamp - b.timestamp);

    if (sortedViolations.length === 0) return windows;

    let currentWindow = {
      start: sortedViolations[0].timestamp,
      end: sortedViolations[0].timestamp + windowSize,
      violations: [] as ExamSecurityEvent[]
    };

    for (const violation of sortedViolations) {
      if (violation.timestamp <= currentWindow.end) {
        currentWindow.violations.push(violation);
      } else {
        if (currentWindow.violations.length > 0) {
          windows.push(currentWindow);
        }
        currentWindow = {
          start: violation.timestamp,
          end: violation.timestamp + windowSize,
          violations: [violation]
        };
      }
    }

    if (currentWindow.violations.length > 0) {
      windows.push(currentWindow);
    }

    return windows;
  }

  /**
   * Calculate timing correlation between user violation patterns
   */
  private calculateTimingCorrelation(userViolationGroups: ExamSecurityEvent[][]): number {
    if (userViolationGroups.length < 2) return 0;

    const allTimestamps = userViolationGroups.flat().map(v => v.timestamp).sort();
    const timeDifferences: number[] = [];

    for (let i = 1; i < allTimestamps.length; i++) {
      timeDifferences.push(allTimestamps[i] - allTimestamps[i-1]);
    }

    if (timeDifferences.length === 0) return 0;

    // Calculate coefficient of variation (lower = more correlated)
    const mean = timeDifferences.reduce((sum, diff) => sum + diff, 0) / timeDifferences.length;
    const variance = timeDifferences.reduce((sum, diff) => sum + Math.pow(diff - mean, 2), 0) / timeDifferences.length;
    const stdDev = Math.sqrt(variance);

    const coefficientOfVariation = stdDev / mean;

    // Convert to correlation score (0-1, higher = more correlated)
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  /**
   * Calculate pattern similarity between users
   */
  private calculatePatternSimilarity(userViolationGroups: ExamSecurityEvent[][]): number {
    if (userViolationGroups.length < 2) return 0;

    const patternVectors: number[][] = userViolationGroups.map(group => {
      const vector = new Array(20).fill(0); // 20 different violation types
      group.forEach(violation => {
        const index = this.getViolationTypeIndex(violation.eventType);
        if (index >= 0 && index < vector.length) {
          vector[index]++;
        }
      });
      return vector;
    });

    // Calculate cosine similarity between all pairs
    const similarities: number[] = [];
    for (let i = 0; i < patternVectors.length; i++) {
      for (let j = i + 1; j < patternVectors.length; j++) {
        similarities.push(this.cosineSimilarity(patternVectors[i], patternVectors[j]));
      }
    }

    // Return average similarity
    return similarities.length > 0
      ? similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length
      : 0;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  /**
   * Get violation type index for pattern analysis
   */
  private getViolationTypeIndex(eventType: string): number {
    const typeMap: Record<string, number> = {
      'tab_switch': 0,
      'window_blur': 1,
      'fullscreen_exit': 2,
      'copy_paste': 3,
      'right_click': 4,
      'dev_tools': 5,
      'screenshot': 6,
      'screen_recording': 7,
      'network_violation': 8,
      'clipboard_operation': 9,
      'debug_attempt': 10,
      'secure_comm_breach': 11,
      'mouse_anomaly': 12,
      'keystroke_anomaly': 13,
      'gaze_anomaly': 14,
      'time_pattern_anomaly': 15,
      'behavior_anomaly': 16,
      'coordinated_cheating': 17
    };

    return typeMap[eventType] || -1;
  }

  /**
   * Calculate network correlation (simplified)
   */
  private calculateNetworkCorrelation(violations: ExamSecurityEvent[]): number {
    // In a real implementation, this would analyze IP addresses, network patterns, etc.
    // For now, return a placeholder
    return 0.5;
  }

  /**
   * Calculate behavioral similarity (simplified)
   */
  private calculateBehavioralSimilarity(userViolationGroups: ExamSecurityEvent[][]): number {
    // In a real implementation, this would analyze behavior patterns
    // For now, return a placeholder
    return 0.5;
  }

  /**
   * Perform comprehensive trend analysis
   */
  async performComprehensiveAnalysis(
    allViolations: ExamSecurityEvent[],
    userHistories: Map<string, SeverityHistory>
  ): Promise<TrendAnalysisResult> {
    const result: TrendAnalysisResult = {
      patterns: [],
      userProfiles: new Map(),
      coordinationAnalyses: [],
      systemHealth: {
        analysisCoverage: 0,
        falsePositiveRate: 0,
        detectionAccuracy: 0,
        processingTime: 0
      },
      recommendations: [],
      generatedAt: Date.now()
    };

    const startTime = Date.now();

    try {
      // Analyze user profiles
      for (const [userId, history] of userHistories.entries()) {
        const profile = await this.analyzeUserTrends(userId, history.scores.map(s => ({
          id: s.metadata.calculatedAt.toString(),
          examId: '',
          userId,
          sessionId: '',
          eventType: 'violation',
          timestamp: s.metadata.calculatedAt,
          severity: s.riskLevel === 'critical' ? 'critical' : s.riskLevel === 'high' ? 'high' : 'medium',
          details: {},
          action: 'log'
        })));

        result.userProfiles.set(userId, profile);
      }

      // Detect repeat offenders
      const repeatPatterns = await this.detectRepeatOffenders(allViolations);
      result.patterns.push(...repeatPatterns);

      // Detect coordinated cheating
      const coordinationAnalyses = await this.detectCoordinatedCheating(allViolations);
      result.coordinationAnalyses.push(...coordinationAnalyses);

      // Convert coordination analyses to trend patterns
      for (const coord of coordinationAnalyses) {
        result.patterns.push({
          id: coord.coordinationId,
          type: 'coordinated_cheating',
          confidence: coord.confidence,
          severity: coord.severity,
          description: `Coordinated cheating detected among ${coord.involvedUsers.length} users`,
          indicators: [
            `Type: ${coord.coordinationType}`,
            `Users involved: ${coord.involvedUsers.join(', ')}`,
            `Timing correlation: ${(coord.evidence.timingCorrelation * 100).toFixed(1)}%`,
            `Pattern similarity: ${(coord.evidence.patternSimilarity * 100).toFixed(1)}%`
          ],
          affectedUsers: coord.involvedUsers,
          timeWindow: coord.timeWindow,
          statisticalData: {
            frequency: coord.involvedUsers.length,
            averageSeverity: coord.confidence * 4, // Convert to 0-4 scale
            trendDirection: 'stable',
            correlationCoefficient: coord.evidence.timingCorrelation
          },
          recommendations: coord.recommendations,
          detectedAt: coord.detectedAt
        });
      }

      // Calculate system health metrics
      result.systemHealth.analysisCoverage = allViolations.length > 0 ? 1.0 : 0;
      result.systemHealth.processingTime = Date.now() - startTime;

      // Generate recommendations
      result.recommendations = this.generateSystemRecommendations(result);

      // Store patterns for future reference
      this.trendPatterns.push(...result.patterns);
      this.coordinationAnalyses.push(...result.coordinationAnalyses);

    } catch (error) {
      console.error('Error performing comprehensive trend analysis:', error);
    }

    return result;
  }

  /**
   * Generate system recommendations based on analysis
   */
  private generateSystemRecommendations(result: TrendAnalysisResult): string[] {
    const recommendations: string[] = [];

    // Check for high-risk patterns
    const highRiskPatterns = result.patterns.filter(p => p.severity === 'high' || p.severity === 'critical');
    if (highRiskPatterns.length > 0) {
      recommendations.push(`${highRiskPatterns.length} high-risk patterns detected - immediate review required`);
    }

    // Check for coordinated cheating
    if (result.coordinationAnalyses.length > 0) {
      recommendations.push(`${result.coordinationAnalyses.length} coordinated cheating incidents detected`);
    }

    // Check user risk distribution
    const highRiskUsers = Array.from(result.userProfiles.values()).filter(p => p.riskScore > 70);
    if (highRiskUsers.length > 0) {
      recommendations.push(`${highRiskUsers.length} users identified as high-risk - consider additional monitoring`);
    }

    // Performance recommendations
    if (result.systemHealth.processingTime > 30000) { // More than 30 seconds
      recommendations.push('Analysis performance is slow - consider optimizing algorithms');
    }

    return recommendations;
  }

  /**
   * Helper methods for analysis
   */
  private countViolationTypes(violations: ExamSecurityEvent[]): Record<string, number> {
    const counts: Record<string, number> = {};
    violations.forEach(v => {
      counts[v.eventType] = (counts[v.eventType] || 0) + 1;
    });
    return counts;
  }

  private calculateAverageSeverity(violations: ExamSecurityEvent[]): number {
    if (violations.length === 0) return 0;

    const severityValues = violations.map(v => {
      switch (v.severity) {
        case 'low': return 1;
        case 'medium': return 2;
        case 'high': return 3;
        case 'critical': return 4;
        default: return 1;
      }
    });

    return severityValues.reduce((sum, val) => sum + val, 0) / severityValues.length;
  }

  private analyzeCommonTimes(violations: ExamSecurityEvent[]): number[] {
    const hourCounts = new Array(24).fill(0);
    violations.forEach(v => {
      const hour = new Date(v.timestamp).getHours();
      hourCounts[hour]++;
    });

    // Return hours with above-average violations
    const average = hourCounts.reduce((sum, count) => sum + count, 0) / 24;
    return hourCounts.map((count, hour) => count > average ? hour : -1).filter(h => h >= 0);
  }

  private analyzeCommonDays(violations: ExamSecurityEvent[]): number[] {
    const dayCounts = new Array(7).fill(0); // 0 = Sunday, 6 = Saturday
    violations.forEach(v => {
      const day = new Date(v.timestamp).getDay();
      dayCounts[day]++;
    });

    // Return days with above-average violations
    const average = dayCounts.reduce((sum, count) => sum + count, 0) / 7;
    return dayCounts.map((count, day) => count > average ? day : -1).filter(d => d >= 0);
  }

  private analyzeNetworkPatterns(violations: ExamSecurityEvent[]): string[] {
    // Analyze network-related violations
    const networkViolations = violations.filter(v =>
      v.eventType === 'network_violation' ||
      v.eventType === 'secure_comm_breach'
    );

    const patterns: string[] = [];
    if (networkViolations.length > 0) {
      patterns.push('network_security_issues');
    }

    return patterns;
  }

  private isRepeatOffender(violations: ExamSecurityEvent[]): boolean {
    const config = this.config.thresholds.repeatOffender;
    const timeWindow = config.timeWindow * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - timeWindow;
    const recentViolations = violations.filter(v => v.timestamp > cutoffTime);

    return recentViolations.length >= config.minViolations;
  }

  private calculateUserRiskScore(profile: UserProfile): number {
    let score = 0;

    // Violation frequency factor
    score += profile.violationHistory.violationFrequency * 10;

    // Average severity factor
    score += profile.violationHistory.averageSeverity * 5;

    // Repeat offender factor
    if (profile.riskFactors.isRepeatOffender) {
      score += 25;
    }

    // Coordinated cheating factor
    score += profile.riskFactors.coordinatedCheatingScore * 10;

    return Math.min(100, score);
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Perform periodic analysis
   */
  private async performPeriodicAnalysis(): Promise<void> {
    try {
      // Clean up old patterns
      const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
      this.trendPatterns = this.trendPatterns.filter(p => p.detectedAt > cutoffTime);
      this.coordinationAnalyses = this.coordinationAnalyses.filter(c => c.detectedAt > cutoffTime);

      // Update user profiles
      for (const [userId, profile] of this.userProfiles.entries()) {
        if (profile.lastUpdated < Date.now() - (24 * 60 * 60 * 1000)) { // Older than 1 day
          // In a real implementation, we would fetch fresh violation data
          profile.lastUpdated = Date.now();
          this.userProfiles.set(userId, profile);
        }
      }

    } catch (error) {
      console.error('Error during periodic analysis:', error);
    }
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoffTime = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days

    // Clear old cache entries
    for (const [key, cached] of this.analysisCache.entries()) {
      if (cached.expires < Date.now()) {
        this.analysisCache.delete(key);
      }
    }

    // Clear very old user profiles (keep last 30 days of data)
    const profileCutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    for (const [userId, profile] of this.userProfiles.entries()) {
      if (profile.lastUpdated < profileCutoff) {
        this.userProfiles.delete(userId);
      }
    }
  }

  /**
   * Get current trend patterns
   */
  getTrendPatterns(timeWindow?: number): TrendPattern[] {
    if (!timeWindow) return [...this.trendPatterns];

    const cutoffTime = Date.now() - timeWindow;
    return this.trendPatterns.filter(p => p.detectedAt > cutoffTime);
  }

  /**
   * Get user profile
   */
  getUserProfile(userId: string): UserProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Get coordination analyses
   */
  getCoordinationAnalyses(timeWindow?: number): CoordinationAnalysis[] {
    if (!timeWindow) return [...this.coordinationAnalyses];

    const cutoffTime = Date.now() - timeWindow;
    return this.coordinationAnalyses.filter(c => c.detectedAt > cutoffTime);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TrendAnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): TrendAnalysisConfig {
    return { ...this.config };
  }

  /**
   * Export analysis data
   */
  exportAnalysisData(format: 'json' | 'csv' = 'json'): any {
    const data = {
      trendPatterns: this.trendPatterns,
      userProfiles: Array.from(this.userProfiles.entries()),
      coordinationAnalyses: this.coordinationAnalyses,
      config: this.config,
      exportTimestamp: Date.now()
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
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
   * Shutdown the engine
   */
  shutdown(): void {
    this.userProfiles.clear();
    this.trendPatterns.length = 0;
    this.coordinationAnalyses.length = 0;
    this.analysisCache.clear();
  }
}

export const trendAnalysisEngine = TrendAnalysisEngine.getInstance();
export default trendAnalysisEngine;
