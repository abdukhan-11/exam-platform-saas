/**
 * Severity Scoring System
 *
 * This module provides a comprehensive severity scoring system for exam security violations,
 * with configurable penalty weights, escalation thresholds, and dynamic scoring algorithms
 * that adapt to user behavior patterns and violation context.
 */

import { ExamSecurityEvent } from './exam-security';

export interface SeverityConfig {
  baseWeights: Record<string, number>; // Base weight for each violation type
  contextMultipliers: {
    firstOffense: number;
    repeatOffense: number;
    duringHighStakes: number;
    outsideBusinessHours: number;
    suspiciousTiming: number;
    patternDetected: number;
  };
  escalationThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  timeDecayFactors: {
    recentViolation: number; // Multiplier for violations in last 5 minutes
    hourly: number; // Decay factor per hour
    daily: number; // Decay factor per day
  };
  userRiskFactors: {
    previousViolations: number; // Weight for user's violation history
    accountAge: number; // Weight based on account age
    trustScore: number; // Weight based on user's trust score
  };
  dynamicThresholds: {
    enabled: boolean;
    adaptationRate: number; // How quickly thresholds adapt (0-1)
    minimumThreshold: number;
    maximumThreshold: number;
  };
}

export interface SeverityScore {
  totalScore: number;
  baseScore: number;
  contextScore: number;
  escalationScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  penaltyWeight: number;
  recommendedActions: string[];
  confidence: number; // 0-1, how confident we are in this score
  factors: {
    violationType: string;
    contextFactors: string[];
    timeFactors: string[];
    userFactors: string[];
  };
  metadata: {
    calculatedAt: number;
    calculationVersion: string;
    adaptiveAdjustments: Record<string, number>;
  };
}

export interface SeverityHistory {
  userId: string;
  scores: SeverityScore[];
  lastCalculated: number;
  averageScore: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  riskProfile: 'low_risk' | 'moderate_risk' | 'high_risk' | 'critical_risk';
}

export interface ScoringContext {
  userId: string;
  sessionId: string;
  examId: string;
  violation: ExamSecurityEvent;
  userHistory: SeverityHistory | null;
  currentTime: number;
  examContext: {
    isHighStakes: boolean;
    timeRemaining: number;
    questionNumber: number;
    totalQuestions: number;
  };
  environmentContext: {
    isBusinessHours: boolean;
    networkQuality: 'good' | 'fair' | 'poor';
    deviceType: 'desktop' | 'laptop' | 'tablet' | 'mobile';
  };
}

class SeverityScoringSystem {
  private static instance: SeverityScoringSystem;
  private config: SeverityConfig;
  private severityHistory: Map<string, SeverityHistory> = new Map();
  private adaptiveThresholds: Map<string, number> = new Map();
  private scoringCache: Map<string, { score: SeverityScore; expires: number }> = new Map();

  private defaultConfig: SeverityConfig = {
    baseWeights: {
      'tab_switch': 15,
      'window_blur': 10,
      'fullscreen_exit': 25,
      'copy_paste': 20,
      'right_click': 5,
      'dev_tools': 30,
      'screenshot': 10,
      'screen_recording': 40,
      'network_violation': 35,
      'clipboard_operation': 15,
      'debug_attempt': 25,
      'secure_comm_breach': 50,
      'mouse_anomaly': 20,
      'keystroke_anomaly': 25,
      'gaze_anomaly': 30,
      'time_pattern_anomaly': 20,
      'behavior_anomaly': 25,
      'coordinated_cheating': 60
    },
    contextMultipliers: {
      firstOffense: 1.0,
      repeatOffense: 1.5,
      duringHighStakes: 1.3,
      outsideBusinessHours: 1.2,
      suspiciousTiming: 1.4,
      patternDetected: 1.6
    },
    escalationThresholds: {
      low: 10,
      medium: 25,
      high: 50,
      critical: 75
    },
    timeDecayFactors: {
      recentViolation: 1.5,
      hourly: 0.95,
      daily: 0.9
    },
    userRiskFactors: {
      previousViolations: 0.1,
      accountAge: 0.05,
      trustScore: 0.2
    },
    dynamicThresholds: {
      enabled: true,
      adaptationRate: 0.1,
      minimumThreshold: 5,
      maximumThreshold: 100
    }
  };

  static getInstance(): SeverityScoringSystem {
    if (!SeverityScoringSystem.instance) {
      SeverityScoringSystem.instance = new SeverityScoringSystem();
    }
    return SeverityScoringSystem.instance;
  }

  constructor() {
    this.config = { ...this.defaultConfig };
  }

  /**
   * Calculate severity score for a violation
   */
  async calculateSeverity(context: ScoringContext): Promise<SeverityScore> {
    const cacheKey = this.generateCacheKey(context);
    const cached = this.scoringCache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return cached.score;
    }

    const score: SeverityScore = {
      totalScore: 0,
      baseScore: 0,
      contextScore: 0,
      escalationScore: 0,
      riskLevel: 'low',
      penaltyWeight: 1.0,
      recommendedActions: [],
      confidence: 1.0,
      factors: {
        violationType: context.violation.eventType,
        contextFactors: [],
        timeFactors: [],
        userFactors: []
      },
      metadata: {
        calculatedAt: Date.now(),
        calculationVersion: '1.0.0',
        adaptiveAdjustments: {}
      }
    };

    try {
      // Calculate base score
      score.baseScore = this.calculateBaseScore(context);
      score.factors.violationType = context.violation.eventType;

      // Calculate context score
      score.contextScore = this.calculateContextScore(context);
      score.factors.contextFactors = this.identifyContextFactors(context);

      // Apply time decay factors
      const timeAdjustedScore = this.applyTimeDecayFactors(score.baseScore + score.contextScore, context);
      score.factors.timeFactors = this.identifyTimeFactors(context);

      // Apply user risk factors
      const userAdjustedScore = this.applyUserRiskFactors(timeAdjustedScore, context);
      score.factors.userFactors = this.identifyUserFactors(context);

      // Calculate escalation score
      score.escalationScore = this.calculateEscalationScore(context);

      // Calculate total score
      score.totalScore = userAdjustedScore + score.escalationScore;

      // Apply adaptive thresholds
      if (this.config.dynamicThresholds.enabled) {
        score.totalScore = this.applyAdaptiveThresholds(score.totalScore, context);
      }

      // Determine risk level
      score.riskLevel = this.determineRiskLevel(score.totalScore);

      // Calculate penalty weight
      score.penaltyWeight = this.calculatePenaltyWeight(score.riskLevel, context);

      // Generate recommended actions
      score.recommendedActions = this.generateRecommendedActions(score, context);

      // Calculate confidence
      score.confidence = this.calculateConfidence(score, context);

      // Update user history
      this.updateSeverityHistory(context.userId, score);

      // Cache the result
      this.scoringCache.set(cacheKey, {
        score,
        expires: Date.now() + (5 * 60 * 1000) // Cache for 5 minutes
      });

      // Adapt thresholds based on this scoring
      if (this.config.dynamicThresholds.enabled) {
        this.adaptThresholds(score, context);
      }

    } catch (error) {
      console.error('Error calculating severity score:', error);
      // Return a default low-risk score on error
      score.totalScore = 5;
      score.riskLevel = 'low';
      score.confidence = 0.5;
    }

    return score;
  }

  /**
   * Calculate base score from violation type
   */
  private calculateBaseScore(context: ScoringContext): number {
    const baseWeight = this.config.baseWeights[context.violation.eventType] || 10;

    // Adjust based on violation severity
    let severityMultiplier = 1.0;
    switch (context.violation.severity) {
      case 'low':
        severityMultiplier = 0.7;
        break;
      case 'medium':
        severityMultiplier = 1.0;
        break;
      case 'high':
        severityMultiplier = 1.3;
        break;
      case 'critical':
        severityMultiplier = 1.6;
        break;
    }

    return baseWeight * severityMultiplier;
  }

  /**
   * Calculate context score based on situational factors
   */
  private calculateContextScore(context: ScoringContext): number {
    let contextScore = 0;
    const multipliers = this.config.contextMultipliers;

    // Check if first offense
    const userHistory = this.severityHistory.get(context.userId);
    const isFirstOffense = !userHistory || userHistory.scores.length === 0;

    if (isFirstOffense) {
      contextScore += this.calculateBaseScore(context) * (multipliers.firstOffense - 1);
    } else {
      contextScore += this.calculateBaseScore(context) * (multipliers.repeatOffense - 1);
    }

    // High-stakes exam multiplier
    if (context.examContext.isHighStakes) {
      contextScore += this.calculateBaseScore(context) * (multipliers.duringHighStakes - 1);
    }

    // Business hours check
    if (!context.environmentContext.isBusinessHours) {
      contextScore += this.calculateBaseScore(context) * (multipliers.outsideBusinessHours - 1);
    }

    // Suspicious timing (end of exam, frequent short intervals)
    if (this.isSuspiciousTiming(context)) {
      contextScore += this.calculateBaseScore(context) * (multipliers.suspiciousTiming - 1);
    }

    // Pattern detection
    if (this.detectsPattern(context)) {
      contextScore += this.calculateBaseScore(context) * (multipliers.patternDetected - 1);
    }

    return contextScore;
  }

  /**
   * Apply time decay factors to score
   */
  private applyTimeDecayFactors(baseScore: number, context: ScoringContext): number {
    let adjustedScore = baseScore;
    const timeFactors = this.config.timeDecayFactors;

    // Check for recent violations (within 5 minutes)
    const userHistory = this.severityHistory.get(context.userId);
    if (userHistory) {
      const recentViolations = userHistory.scores.filter(
        s => (context.currentTime - s.metadata.calculatedAt) < (5 * 60 * 1000)
      );

      if (recentViolations.length > 0) {
        adjustedScore *= timeFactors.recentViolation;
      }
    }

    // Apply hourly decay
    if (userHistory && userHistory.scores.length > 0) {
      const hoursSinceLast = (context.currentTime - userHistory.lastCalculated) / (60 * 60 * 1000);
      const decayFactor = Math.pow(timeFactors.hourly, hoursSinceLast);
      adjustedScore *= decayFactor;
    }

    return adjustedScore;
  }

  /**
   * Apply user risk factors
   */
  private applyUserRiskFactors(baseScore: number, context: ScoringContext): number {
    let adjustedScore = baseScore;
    const riskFactors = this.config.userRiskFactors;

    const userHistory = this.severityHistory.get(context.userId);
    if (userHistory) {
      // Previous violations factor
      const violationCount = userHistory.scores.length;
      adjustedScore += violationCount * riskFactors.previousViolations;

      // Average score factor
      adjustedScore += userHistory.averageScore * riskFactors.trustScore;
    }

    return adjustedScore;
  }

  /**
   * Calculate escalation score based on violation patterns
   */
  private calculateEscalationScore(context: ScoringContext): number {
    let escalationScore = 0;

    const userHistory = this.severityHistory.get(context.userId);
    if (!userHistory) return 0;

    // Rapid succession of violations
    const recentViolations = userHistory.scores.filter(
      s => (context.currentTime - s.metadata.calculatedAt) < (10 * 60 * 1000) // Last 10 minutes
    );

    if (recentViolations.length >= 3) {
      escalationScore += 15;
    } else if (recentViolations.length >= 5) {
      escalationScore += 30;
    }

    // Increasing severity trend
    const recentHighSeverity = recentViolations.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical');
    if (recentHighSeverity.length >= 2) {
      escalationScore += 20;
    }

    return escalationScore;
  }

  /**
   * Apply adaptive thresholds
   */
  private applyAdaptiveThresholds(score: number, context: ScoringContext): number {
    const adaptiveKey = `${context.userId}_${context.violation.eventType}`;
    const adaptiveThreshold = this.adaptiveThresholds.get(adaptiveKey);

    if (adaptiveThreshold) {
      // Adjust score based on adaptive threshold
      const adjustment = (score - adaptiveThreshold) * 0.1;
      return Math.max(0, score + adjustment);
    }

    return score;
  }

  /**
   * Determine risk level from total score
   */
  private determineRiskLevel(totalScore: number): 'low' | 'medium' | 'high' | 'critical' {
    const thresholds = this.config.escalationThresholds;

    if (totalScore >= thresholds.critical) return 'critical';
    if (totalScore >= thresholds.high) return 'high';
    if (totalScore >= thresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Calculate penalty weight based on risk level
   */
  private calculatePenaltyWeight(riskLevel: string, context: ScoringContext): number {
    const baseWeights = {
      low: 1.0,
      medium: 1.5,
      high: 2.0,
      critical: 3.0
    };

    let weight = baseWeights[riskLevel as keyof typeof baseWeights] || 1.0;

    // Adjust based on exam context
    if (context.examContext.isHighStakes) {
      weight *= 1.2;
    }

    // Adjust based on time remaining (more critical near end of exam)
    if (context.examContext.timeRemaining < 300) { // Less than 5 minutes
      weight *= 1.3;
    }

    return weight;
  }

  /**
   * Generate recommended actions based on score and context
   */
  private generateRecommendedActions(score: SeverityScore, context: ScoringContext): string[] {
    const actions: string[] = [];

    switch (score.riskLevel) {
      case 'low':
        actions.push('Log violation for review');
        actions.push('Send warning notification to user');
        break;

      case 'medium':
        actions.push('Log violation with detailed context');
        actions.push('Send warning notification to user');
        actions.push('Flag user for additional monitoring');
        break;

      case 'high':
        actions.push('Log violation with evidence collection');
        actions.push('Send stern warning to user');
        actions.push('Notify exam proctor/administrator');
        actions.push('Consider temporary suspension of exam privileges');
        break;

      case 'critical':
        actions.push('Log violation with comprehensive evidence');
        actions.push('Immediately terminate exam session');
        actions.push('Notify all relevant administrators');
        actions.push('Flag user account for review');
        actions.push('Generate incident report');
        break;
    }

    // Add context-specific actions
    if (context.examContext.timeRemaining < 600) { // Less than 10 minutes
      actions.push('Consider allowing exam completion with penalty');
    }

    if (this.detectsPattern(context)) {
      actions.push('Investigate for coordinated cheating');
    }

    return actions;
  }

  /**
   * Calculate confidence in the score
   */
  private calculateConfidence(score: SeverityScore, context: ScoringContext): number {
    let confidence = 1.0;

    // Reduce confidence if we have limited user history
    const userHistory = this.severityHistory.get(context.userId);
    if (!userHistory || userHistory.scores.length < 3) {
      confidence *= 0.8;
    }

    // Reduce confidence for new violation types
    if (!this.adaptiveThresholds.has(`${context.userId}_${context.violation.eventType}`)) {
      confidence *= 0.9;
    }

    // Reduce confidence if score is borderline
    const thresholds = this.config.escalationThresholds;
    const scoreValue = score.totalScore;

    if (
      (scoreValue > thresholds.low && scoreValue < thresholds.medium) ||
      (scoreValue > thresholds.medium && scoreValue < thresholds.high) ||
      (scoreValue > thresholds.high && scoreValue < thresholds.critical)
    ) {
      confidence *= 0.95;
    }

    return Math.max(0.1, confidence);
  }

  /**
   * Identify context factors
   */
  private identifyContextFactors(context: ScoringContext): string[] {
    const factors: string[] = [];

    if (context.examContext.isHighStakes) {
      factors.push('high_stakes_exam');
    }

    if (!context.environmentContext.isBusinessHours) {
      factors.push('outside_business_hours');
    }

    if (context.environmentContext.networkQuality === 'poor') {
      factors.push('poor_network_quality');
    }

    if (context.environmentContext.deviceType === 'mobile') {
      factors.push('mobile_device');
    }

    return factors;
  }

  /**
   * Identify time factors
   */
  private identifyTimeFactors(context: ScoringContext): string[] {
    const factors: string[] = [];

    const userHistory = this.severityHistory.get(context.userId);
    if (userHistory) {
      const recentViolations = userHistory.scores.filter(
        s => (context.currentTime - s.metadata.calculatedAt) < (5 * 60 * 1000)
      );

      if (recentViolations.length > 0) {
        factors.push('recent_violations');
      }
    }

    if (context.examContext.timeRemaining < 300) {
      factors.push('near_exam_end');
    }

    return factors;
  }

  /**
   * Identify user factors
   */
  private identifyUserFactors(context: ScoringContext): string[] {
    const factors: string[] = [];

    const userHistory = this.severityHistory.get(context.userId);
    if (userHistory) {
      if (userHistory.scores.length > 5) {
        factors.push('frequent_offender');
      }

      if (userHistory.riskProfile === 'high_risk') {
        factors.push('high_risk_profile');
      }
    }

    return factors;
  }

  /**
   * Check if timing is suspicious
   */
  private isSuspiciousTiming(context: ScoringContext): boolean {
    // Check if violation occurs at suspicious times
    const timeRemaining = context.examContext.timeRemaining;
    const questionProgress = context.examContext.questionNumber / context.examContext.totalQuestions;

    // Suspicious if violation occurs near end of exam
    if (timeRemaining < 600 && questionProgress > 0.8) { // Last 10 minutes, last 20% of questions
      return true;
    }

    // Check for clustered violations
    const userHistory = this.severityHistory.get(context.userId);
    if (userHistory) {
      const recentViolations = userHistory.scores.filter(
        s => (context.currentTime - s.metadata.calculatedAt) < (2 * 60 * 1000) // Last 2 minutes
      );

      if (recentViolations.length >= 2) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect if violation follows a pattern
   */
  private detectsPattern(context: ScoringContext): boolean {
    const userHistory = this.severityHistory.get(context.userId);
    if (!userHistory || userHistory.scores.length < 3) {
      return false;
    }

    // Check for repeated same violation type
    const sameTypeViolations = userHistory.scores.filter(
      s => s.factors.violationType === context.violation.eventType
    );

    if (sameTypeViolations.length >= 3) {
      return true;
    }

    // Check for escalating severity
    const recentScores = userHistory.scores.slice(-5);
    const severityLevels = recentScores.map(s => {
      switch (s.riskLevel) {
        case 'low': return 1;
        case 'medium': return 2;
        case 'high': return 3;
        case 'critical': return 4;
        default: return 0;
      }
    });

    // Check if severity is increasing
    let increasingCount = 0;
    for (let i = 1; i < severityLevels.length; i++) {
      if (severityLevels[i] > severityLevels[i-1]) {
        increasingCount++;
      }
    }

    return increasingCount >= 3;
  }

  /**
   * Update severity history for user
   */
  private updateSeverityHistory(userId: string, score: SeverityScore): void {
    let history = this.severityHistory.get(userId);

    if (!history) {
      history = {
        userId,
        scores: [],
        lastCalculated: 0,
        averageScore: 0,
        trendDirection: 'stable',
        riskProfile: 'low_risk'
      };
    }

    // Add new score
    history.scores.push(score);
    history.lastCalculated = score.metadata.calculatedAt;

    // Keep only last 50 scores
    if (history.scores.length > 50) {
      history.scores = history.scores.slice(-50);
    }

    // Calculate average score
    history.averageScore = history.scores.reduce((sum, s) => sum + s.totalScore, 0) / history.scores.length;

    // Determine trend direction
    if (history.scores.length >= 3) {
      const recent = history.scores.slice(-3);
      const first = recent[0].totalScore;
      const last = recent[recent.length - 1].totalScore;

      if (last > first + 5) {
        history.trendDirection = 'increasing';
      } else if (last < first - 5) {
        history.trendDirection = 'decreasing';
      } else {
        history.trendDirection = 'stable';
      }
    }

    // Determine risk profile
    const avgScore = history.averageScore;
    if (avgScore >= 60) {
      history.riskProfile = 'critical_risk';
    } else if (avgScore >= 40) {
      history.riskProfile = 'high_risk';
    } else if (avgScore >= 20) {
      history.riskProfile = 'moderate_risk';
    } else {
      history.riskProfile = 'low_risk';
    }

    this.severityHistory.set(userId, history);
  }

  /**
   * Adapt thresholds based on scoring patterns
   */
  private adaptThresholds(score: SeverityScore, context: ScoringContext): void {
    const adaptiveKey = `${context.userId}_${context.violation.eventType}`;
    const currentThreshold = this.adaptiveThresholds.get(adaptiveKey) || score.totalScore;

    // Adapt threshold based on scoring pattern
    const adaptationRate = this.config.dynamicThresholds.adaptationRate;
    const newThreshold = currentThreshold * (1 - adaptationRate) + score.totalScore * adaptationRate;

    // Constrain to min/max bounds
    const constrainedThreshold = Math.max(
      this.config.dynamicThresholds.minimumThreshold,
      Math.min(this.config.dynamicThresholds.maximumThreshold, newThreshold)
    );

    this.adaptiveThresholds.set(adaptiveKey, constrainedThreshold);

    // Store adaptive adjustment in score metadata
    score.metadata.adaptiveAdjustments[adaptiveKey] = constrainedThreshold;
  }

  /**
   * Get severity history for user
   */
  getSeverityHistory(userId: string): SeverityHistory | null {
    return this.severityHistory.get(userId) || null;
  }

  /**
   * Get adaptive thresholds for user
   */
  getAdaptiveThresholds(userId: string): Record<string, number> {
    const thresholds: Record<string, number> = {};

    for (const [key, threshold] of this.adaptiveThresholds.entries()) {
      if (key.startsWith(`${userId}_`)) {
        const violationType = key.replace(`${userId}_`, '');
        thresholds[violationType] = threshold;
      }
    }

    return thresholds;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SeverityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): SeverityConfig {
    return { ...this.config };
  }

  /**
   * Reset user history
   */
  resetUserHistory(userId: string): void {
    this.severityHistory.delete(userId);

    // Remove adaptive thresholds for user
    for (const key of this.adaptiveThresholds.keys()) {
      if (key.startsWith(`${userId}_`)) {
        this.adaptiveThresholds.delete(key);
      }
    }

    // Clear cache entries for user
    for (const cacheKey of this.scoringCache.keys()) {
      if (cacheKey.includes(userId)) {
        this.scoringCache.delete(cacheKey);
      }
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(context: ScoringContext): string {
    return `${context.userId}_${context.violation.id}_${context.currentTime}`;
  }

  /**
   * Export scoring data
   */
  exportScoringData(userId?: string, format: 'json' | 'csv' = 'json'): any {
    let data: any;

    if (userId) {
      data = {
        userId,
        severityHistory: this.severityHistory.get(userId),
        adaptiveThresholds: this.getAdaptiveThresholds(userId)
      };
    } else {
      data = {
        allHistories: Array.from(this.severityHistory.entries()),
        adaptiveThresholds: Array.from(this.adaptiveThresholds.entries()),
        config: this.config
      };
    }

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
   * Clear old data
   */
  clearOldData(olderThanDays: number = 30): void {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    // Clear old history scores
    for (const [userId, history] of this.severityHistory.entries()) {
      history.scores = history.scores.filter(score => score.metadata.calculatedAt > cutoffTime);

      if (history.scores.length === 0) {
        this.severityHistory.delete(userId);
      } else {
        // Recalculate average
        history.averageScore = history.scores.reduce((sum, s) => sum + s.totalScore, 0) / history.scores.length;
        this.severityHistory.set(userId, history);
      }
    }

    // Clear old cache entries
    for (const [key, cached] of this.scoringCache.entries()) {
      if (cached.expires < Date.now()) {
        this.scoringCache.delete(key);
      }
    }
  }

  /**
   * Shutdown the system
   */
  shutdown(): void {
    this.severityHistory.clear();
    this.adaptiveThresholds.clear();
    this.scoringCache.clear();
  }
}

export const severityScoringSystem = SeverityScoringSystem.getInstance();
export default severityScoringSystem;
