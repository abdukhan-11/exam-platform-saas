/**
 * AI-Powered Behavior Analysis Module
 *
 * This module implements advanced machine learning-based behavior analysis
 * for detecting cheating patterns during exams through mouse tracking,
 * keystroke dynamics, gaze analysis, and time-based pattern recognition.
 */

export interface MouseMovementData {
  x: number;
  y: number;
  timestamp: number;
  velocity: number;
  acceleration: number;
  direction: number;
}

export interface KeystrokeData {
  key: string;
  timestamp: number;
  duration: number;
  interval: number; // Time since last keystroke
  isBackspace: boolean;
  isSpecial: boolean;
}

export interface GazeData {
  x: number;
  y: number;
  timestamp: number;
  confidence: number;
  pupilDilation: number;
  blinkRate: number;
}

export interface TimePatternData {
  questionId: string;
  startTime: number;
  endTime: number;
  timeSpent: number;
  answerLength: number;
  hesitationCount: number;
  revisionCount: number;
}

export interface BehaviorAnalysisResult {
  anomalyScore: number;
  confidence: number;
  detectedPatterns: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  timestamp: number;
}

export interface BehaviorModelConfig {
  mouseVelocityThreshold: number;
  keystrokeIntervalThreshold: number;
  gazeAttentionThreshold: number;
  timePatternThreshold: number;
  anomalyScoreWeight: {
    mouse: number;
    keystroke: number;
    gaze: number;
    time: number;
  };
}

class BehaviorAnalysisEngine {
  private static instance: BehaviorAnalysisEngine;
  private mouseDataBuffer: Map<string, MouseMovementData[]> = new Map();
  private keystrokeDataBuffer: Map<string, KeystrokeData[]> = new Map();
  private gazeDataBuffer: Map<string, GazeData[]> = new Map();
  private timePatternBuffer: Map<string, TimePatternData[]> = new Map();
  private behaviorModels: Map<string, BehaviorModelConfig> = new Map();
  private anomalyDetectors: Map<string, AnomalyDetector> = new Map();

  static getInstance(): BehaviorAnalysisEngine {
    if (!BehaviorAnalysisEngine.instance) {
      BehaviorAnalysisEngine.instance = new BehaviorAnalysisEngine();
    }
    return BehaviorAnalysisEngine.instance;
  }

  /**
   * Initialize behavior analysis for an exam session
   */
  initializeAnalysis(sessionId: string, config: BehaviorModelConfig): void {
    this.behaviorModels.set(sessionId, config);
    this.mouseDataBuffer.set(sessionId, []);
    this.keystrokeDataBuffer.set(sessionId, []);
    this.gazeDataBuffer.set(sessionId, []);
    this.timePatternBuffer.set(sessionId, []);

    // Initialize anomaly detectors
    this.anomalyDetectors.set(sessionId, new AnomalyDetector(config));
  }

  /**
   * Record mouse movement data
   */
  recordMouseMovement(sessionId: string, x: number, y: number): void {
    const buffer = this.mouseDataBuffer.get(sessionId);
    if (!buffer) return;

    const timestamp = Date.now();
    const previous = buffer[buffer.length - 1];

    let velocity = 0;
    let acceleration = 0;
    let direction = 0;

    if (previous) {
      const timeDiff = timestamp - previous.timestamp;
      const distance = Math.sqrt(Math.pow(x - previous.x, 2) + Math.pow(y - previous.y, 2));
      velocity = distance / timeDiff;

      if (buffer.length > 1) {
        const prevPrev = buffer[buffer.length - 2];
        const prevVelocity = Math.sqrt(Math.pow(previous.x - prevPrev.x, 2) + Math.pow(previous.y - prevPrev.y, 2)) / (previous.timestamp - prevPrev.timestamp);
        acceleration = (velocity - prevVelocity) / timeDiff;
      }

      direction = Math.atan2(y - previous.y, x - previous.x);
    }

    const data: MouseMovementData = {
      x, y, timestamp, velocity, acceleration, direction
    };

    buffer.push(data);

    // Keep buffer size manageable
    if (buffer.length > 1000) {
      buffer.shift();
    }

    this.mouseDataBuffer.set(sessionId, buffer);
  }

  /**
   * Record keystroke data
   */
  recordKeystroke(sessionId: string, key: string, duration: number): void {
    const buffer = this.keystrokeDataBuffer.get(sessionId);
    if (!buffer) return;

    const timestamp = Date.now();
    const previous = buffer[buffer.length - 1];

    const interval = previous ? timestamp - previous.timestamp : 0;

    const data: KeystrokeData = {
      key,
      timestamp,
      duration,
      interval,
      isBackspace: key === 'Backspace',
      isSpecial: ['Shift', 'Control', 'Alt', 'Meta', 'Enter', 'Tab'].includes(key)
    };

    buffer.push(data);

    // Keep buffer size manageable
    if (buffer.length > 500) {
      buffer.shift();
    }

    this.keystrokeDataBuffer.set(sessionId, buffer);
  }

  /**
   * Record gaze tracking data
   */
  recordGazeData(sessionId: string, x: number, y: number, confidence: number, pupilDilation: number, blinkRate: number): void {
    const buffer = this.gazeDataBuffer.get(sessionId);
    if (!buffer) return;

    const data: GazeData = {
      x, y, confidence, pupilDilation, blinkRate, timestamp: Date.now()
    };

    buffer.push(data);

    // Keep buffer size manageable
    if (buffer.length > 200) {
      buffer.shift();
    }

    this.gazeDataBuffer.set(sessionId, buffer);
  }

  /**
   * Record time pattern data for questions
   */
  recordTimePattern(sessionId: string, questionId: string, startTime: number, endTime: number, answerLength: number, hesitationCount: number, revisionCount: number): void {
    const buffer = this.timePatternBuffer.get(sessionId);
    if (!buffer) return;

    const data: TimePatternData = {
      questionId,
      startTime,
      endTime,
      timeSpent: endTime - startTime,
      answerLength,
      hesitationCount,
      revisionCount
    };

    buffer.push(data);

    // Keep buffer size manageable
    if (buffer.length > 100) {
      buffer.shift();
    }

    this.timePatternBuffer.set(sessionId, buffer);
  }

  /**
   * Analyze behavior patterns and detect anomalies
   */
  async analyzeBehavior(sessionId: string): Promise<BehaviorAnalysisResult> {
    const detector = this.anomalyDetectors.get(sessionId);
    if (!detector) {
      return {
        anomalyScore: 0,
        confidence: 0,
        detectedPatterns: [],
        riskLevel: 'low',
        recommendations: [],
        timestamp: Date.now()
      };
    }

    const mouseData = this.mouseDataBuffer.get(sessionId) || [];
    const keystrokeData = this.keystrokeDataBuffer.get(sessionId) || [];
    const gazeData = this.gazeDataBuffer.get(sessionId) || [];
    const timeData = this.timePatternBuffer.get(sessionId) || [];

    const result = await detector.analyzeAll(mouseData, keystrokeData, gazeData, timeData);

    // Check for coordinated cheating patterns
    const coordinatedPatterns = this.detectCoordinatedCheating(sessionId, result);

    if (coordinatedPatterns.length > 0) {
      result.detectedPatterns.push(...coordinatedPatterns);
      result.anomalyScore = Math.min(100, result.anomalyScore + 25);
    }

    return result;
  }

  /**
   * Detect coordinated cheating attempts across multiple sessions
   */
  private detectCoordinatedCheating(sessionId: string, currentResult: BehaviorAnalysisResult): string[] {
    const patterns: string[] = [];
    const examId = sessionId.split('_')[0];

    // Get all sessions for the same exam
    const relatedSessions = Array.from(this.anomalyDetectors.keys())
      .filter(key => key.startsWith(examId) && key !== sessionId);

    if (relatedSessions.length === 0) return patterns;

    // Check for synchronized anomalies
    const currentTime = Date.now();
    const timeWindow = 5 * 60 * 1000; // 5 minutes

    const synchronizedAnomalies = relatedSessions.filter(otherSession => {
      const detector = this.anomalyDetectors.get(otherSession);
      const otherResult = detector?.getLastAnalysisResult();
      if (!otherResult) return false;

      return Math.abs(otherResult.timestamp - currentTime) < timeWindow &&
             otherResult.anomalyScore > 70;
    });

    if (synchronizedAnomalies.length > 0) {
      patterns.push(`coordinated_cheating_detected_${synchronizedAnomalies.length}_sessions`);
    }

    // Check for identical mouse movement patterns
    const mousePatterns = this.analyzeMousePatternSimilarity(sessionId);
    if (mousePatterns.length > 0) {
      patterns.push(...mousePatterns);
    }

    return patterns;
  }

  /**
   * Analyze mouse pattern similarity across sessions
   */
  private analyzeMousePatternSimilarity(sessionId: string): string[] {
    const patterns: string[] = [];
    const examId = sessionId.split('_')[0];
    const currentMouseData = this.mouseDataBuffer.get(sessionId) || [];

    if (currentMouseData.length < 10) return patterns;

    const relatedSessions = Array.from(this.mouseDataBuffer.keys())
      .filter(key => key.startsWith(examId) && key !== sessionId);

    for (const otherSession of relatedSessions) {
      const otherMouseData = this.mouseDataBuffer.get(otherSession) || [];
      if (otherMouseData.length < 10) continue;

      const similarity = this.calculateMousePatternSimilarity(currentMouseData, otherMouseData);

      if (similarity > 0.8) { // 80% similarity threshold
        patterns.push(`identical_mouse_patterns_${otherSession}`);
      }
    }

    return patterns;
  }

  /**
   * Calculate similarity between mouse movement patterns
   */
  private calculateMousePatternSimilarity(data1: MouseMovementData[], data2: MouseMovementData[]): number {
    if (data1.length === 0 || data2.length === 0) return 0;

    const minLength = Math.min(data1.length, data2.length);
    const recent1 = data1.slice(-minLength);
    const recent2 = data2.slice(-minLength);

    let totalSimilarity = 0;

    for (let i = 0; i < minLength; i++) {
      const similarity = 1 - Math.abs(recent1[i].velocity - recent2[i].velocity) / Math.max(recent1[i].velocity, recent2[i].velocity, 1);
      totalSimilarity += similarity;
    }

    return totalSimilarity / minLength;
  }

  /**
   * Clean up data for a completed session
   */
  cleanupSession(sessionId: string): void {
    this.mouseDataBuffer.delete(sessionId);
    this.keystrokeDataBuffer.delete(sessionId);
    this.gazeDataBuffer.delete(sessionId);
    this.timePatternBuffer.delete(sessionId);
    this.behaviorModels.delete(sessionId);
    this.anomalyDetectors.delete(sessionId);
  }

  /**
   * Get behavior analysis statistics
   */
  getBehaviorStats(sessionId: string): {
    mouseMovements: number;
    keystrokes: number;
    gazePoints: number;
    timePatterns: number;
  } {
    return {
      mouseMovements: this.mouseDataBuffer.get(sessionId)?.length || 0,
      keystrokes: this.keystrokeDataBuffer.get(sessionId)?.length || 0,
      gazePoints: this.gazeDataBuffer.get(sessionId)?.length || 0,
      timePatterns: this.timePatternBuffer.get(sessionId)?.length || 0
    };
  }
}

/**
 * Anomaly Detection Engine
 */
class AnomalyDetector {
  private config: BehaviorModelConfig;
  private lastAnalysisResult: BehaviorAnalysisResult | null = null;

  /**
   * Get the last analysis result
   */
  getLastAnalysisResult(): BehaviorAnalysisResult | null {
    return this.lastAnalysisResult;
  }

  constructor(config: BehaviorModelConfig) {
    this.config = config;
  }

  /**
   * Analyze all behavior data types
   */
  async analyzeAll(
    mouseData: MouseMovementData[],
    keystrokeData: KeystrokeData[],
    gazeData: GazeData[],
    timeData: TimePatternData[]
  ): Promise<BehaviorAnalysisResult> {
    const mouseScore = this.analyzeMouseMovements(mouseData);
    const keystrokeScore = this.analyzeKeystrokes(keystrokeData);
    const gazeScore = this.analyzeGazeData(gazeData);
    const timeScore = this.analyzeTimePatterns(timeData);

    const anomalyScore = (
      mouseScore.score * this.config.anomalyScoreWeight.mouse +
      keystrokeScore.score * this.config.anomalyScoreWeight.keystroke +
      gazeScore.score * this.config.anomalyScoreWeight.gaze +
      timeScore.score * this.config.anomalyScoreWeight.time
    );

    const confidence = (mouseScore.confidence + keystrokeScore.confidence + gazeScore.confidence + timeScore.confidence) / 4;

    const detectedPatterns = [
      ...mouseScore.patterns,
      ...keystrokeScore.patterns,
      ...gazeScore.patterns,
      ...timeScore.patterns
    ];

    const riskLevel = this.calculateRiskLevel(anomalyScore);
    const recommendations = this.generateRecommendations(detectedPatterns, riskLevel);

    const result: BehaviorAnalysisResult = {
      anomalyScore: Math.min(100, anomalyScore),
      confidence,
      detectedPatterns,
      riskLevel,
      recommendations,
      timestamp: Date.now()
    };

    this.lastAnalysisResult = result;
    return result;
  }

  /**
   * Analyze mouse movement patterns
   */
  private analyzeMouseMovements(data: MouseMovementData[]): { score: number; confidence: number; patterns: string[] } {
    if (data.length < 10) {
      return { score: 0, confidence: 0, patterns: [] };
    }

    const patterns: string[] = [];
    let anomalyScore = 0;
    let confidence = 0;

    // Analyze velocity anomalies
    const velocities = data.map(d => d.velocity);
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const velocityVariance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;

    if (velocityVariance > this.config.mouseVelocityThreshold) {
      patterns.push('erratic_mouse_movements');
      anomalyScore += 30;
      confidence += 0.8;
    }

    // Detect robotic patterns (perfect straight lines, constant velocity)
    const straightLineMovements = data.filter((d, i) => {
      if (i === 0) return false;
      const prev = data[i - 1];
      const angle = Math.abs(d.direction - prev.direction);
      return angle < 0.1; // Very straight movement
    });

    if (straightLineMovements.length > data.length * 0.3) {
      patterns.push('robotic_mouse_movements');
      anomalyScore += 25;
      confidence += 0.7;
    }

    // Detect sudden acceleration changes
    const accelerations = data.map(d => d.acceleration);
    const maxAcceleration = Math.max(...accelerations.map(Math.abs));

    if (maxAcceleration > 5000) { // Very high acceleration
      patterns.push('sudden_mouse_acceleration');
      anomalyScore += 20;
      confidence += 0.6;
    }

    return {
      score: Math.min(100, anomalyScore),
      confidence: Math.min(1, confidence),
      patterns
    };
  }

  /**
   * Analyze keystroke dynamics
   */
  private analyzeKeystrokes(data: KeystrokeData[]): { score: number; confidence: number; patterns: string[] } {
    if (data.length < 20) {
      return { score: 0, confidence: 0, patterns: [] };
    }

    const patterns: string[] = [];
    let anomalyScore = 0;
    let confidence = 0;

    // Analyze typing intervals
    const intervals = data.map(d => d.interval).filter(i => i > 0);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalVariance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;

    if (intervalVariance < 10) { // Too consistent (robotic)
      patterns.push('robotic_typing_pattern');
      anomalyScore += 35;
      confidence += 0.9;
    }

    // Analyze backspace frequency
    const backspaceCount = data.filter(d => d.isBackspace).length;
    const backspaceRate = backspaceCount / data.length;

    if (backspaceRate > 0.15) { // High error rate
      patterns.push('excessive_backspacing');
      anomalyScore += 20;
      confidence += 0.7;
    }

    // Detect copy-paste patterns (rapid succession of characters)
    const rapidSequences = data.filter((d, i) => {
      if (i < 5) return false;
      const recent = data.slice(i - 5, i + 1);
      return recent.every(r => r.interval < 10); // Very fast typing
    });

    if (rapidSequences.length > data.length * 0.1) {
      patterns.push('rapid_text_insertion');
      anomalyScore += 30;
      confidence += 0.8;
    }

    return {
      score: Math.min(100, anomalyScore),
      confidence: Math.min(1, confidence),
      patterns
    };
  }

  /**
   * Analyze gaze tracking data
   */
  private analyzeGazeData(data: GazeData[]): { score: number; confidence: number; patterns: string[] } {
    if (data.length < 5) {
      return { score: 0, confidence: 0, patterns: [] };
    }

    const patterns: string[] = [];
    let anomalyScore = 0;
    let confidence = 0;

    // Analyze attention patterns
    const avgConfidence = data.reduce((sum, d) => sum + d.confidence, 0) / data.length;

    if (avgConfidence < this.config.gazeAttentionThreshold) {
      patterns.push('low_attention_detected');
      anomalyScore += 25;
      confidence += 0.7;
    }

    // Detect unusual gaze patterns (staring at one point too long)
    const fixedGazePoints = data.filter((d, i) => {
      if (i < 10) return false;
      const recent = data.slice(i - 10, i + 1);
      const avgX = recent.reduce((sum, r) => sum + r.x, 0) / recent.length;
      const avgY = recent.reduce((sum, r) => sum + r.y, 0) / recent.length;

      return recent.every(r => Math.abs(r.x - avgX) < 10 && Math.abs(r.y - avgY) < 10);
    });

    if (fixedGazePoints.length > data.length * 0.2) {
      patterns.push('unusual_gaze_fixation');
      anomalyScore += 20;
      confidence += 0.6;
    }

    // Analyze blink rate anomalies
    const avgBlinkRate = data.reduce((sum, d) => sum + d.blinkRate, 0) / data.length;

    if (avgBlinkRate < 0.5 || avgBlinkRate > 30) { // Abnormal blink rate
      patterns.push('abnormal_blink_rate');
      anomalyScore += 15;
      confidence += 0.5;
    }

    // Analyze pupil dilation (stress indicator)
    const avgPupilDilation = data.reduce((sum, d) => sum + d.pupilDilation, 0) / data.length;

    if (avgPupilDilation > 0.8) { // High stress/anxiety
      patterns.push('elevated_stress_indicators');
      anomalyScore += 10;
      confidence += 0.4;
    }

    return {
      score: Math.min(100, anomalyScore),
      confidence: Math.min(1, confidence),
      patterns
    };
  }

  /**
   * Analyze time-based patterns
   */
  private analyzeTimePatterns(data: TimePatternData[]): { score: number; confidence: number; patterns: string[] } {
    if (data.length < 3) {
      return { score: 0, confidence: 0, patterns: [] };
    }

    const patterns: string[] = [];
    let anomalyScore = 0;
    let confidence = 0;

    // Analyze time spent per question
    const times = data.map(d => d.timeSpent);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const timeVariance = times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length;

    if (timeVariance > this.config.timePatternThreshold) {
      patterns.push('inconsistent_time_patterns');
      anomalyScore += 25;
      confidence += 0.7;
    }

    // Detect suspiciously fast answers
    const fastAnswers = data.filter(d => d.timeSpent < 5000 && d.answerLength > 50); // Less than 5 seconds for substantial answer

    if (fastAnswers.length > data.length * 0.2) {
      patterns.push('suspiciously_fast_answers');
      anomalyScore += 30;
      confidence += 0.8;
    }

    // Analyze hesitation patterns
    const avgHesitations = data.reduce((sum, d) => sum + d.hesitationCount, 0) / data.length;

    if (avgHesitations > 5) { // Too many hesitations
      patterns.push('excessive_hesitation');
      anomalyScore += 15;
      confidence += 0.6;
    }

    // Detect revision patterns (frequent backspacing/changes)
    const avgRevisions = data.reduce((sum, d) => sum + d.revisionCount, 0) / data.length;

    if (avgRevisions > 3) {
      patterns.push('frequent_answer_revisions');
      anomalyScore += 20;
      confidence += 0.7;
    }

    return {
      score: Math.min(100, anomalyScore),
      confidence: Math.min(1, confidence),
      patterns
    };
  }

  /**
   * Calculate risk level from anomaly score
   */
  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations based on detected patterns and risk level
   */
  private generateRecommendations(patterns: string[], riskLevel: string): string[] {
    const recommendations: string[] = [];

    if (patterns.includes('robotic_mouse_movements') || patterns.includes('robotic_typing_pattern')) {
      recommendations.push('Automated behavior detected - consider manual verification');
    }

    if (patterns.includes('rapid_text_insertion') || patterns.includes('suspiciously_fast_answers')) {
      recommendations.push('Unusual speed detected - review answer authenticity');
    }

    if (patterns.includes('low_attention_detected') || patterns.includes('unusual_gaze_fixation')) {
      recommendations.push('Attention anomalies detected - consider proctoring intervention');
    }

    if (patterns.includes('coordinated_cheating_detected')) {
      recommendations.push('Coordinated cheating suspected - investigate multiple sessions');
    }

    if (patterns.includes('identical_mouse_patterns')) {
      recommendations.push('Identical behavior patterns detected - check for session sharing');
    }

    if (riskLevel === 'critical') {
      recommendations.push('Critical risk level - immediate intervention recommended');
    } else if (riskLevel === 'high') {
      recommendations.push('High risk level - close monitoring advised');
    }

    return recommendations;
  }
}

export const behaviorAnalysisEngine = BehaviorAnalysisEngine.getInstance();
