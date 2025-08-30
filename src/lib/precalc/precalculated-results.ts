import { db } from '@/lib/db';
import { getRedisCache } from '@/lib/cache/redis-cache';

// Pre-calculated result types
export interface PrecalculatedExamStats {
  examId: string;
  totalStudents: number;
  submittedCount: number;
  completionRate: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  standardDeviation: number;
  gradeDistribution: Record<string, number>;
  lastUpdated: Date;
}

export interface PrecalculatedStudentSummary {
  userId: string;
  totalExams: number;
  completedExams: number;
  averageScore: number;
  overallGrade: string;
  improvementTrend: 'improving' | 'declining' | 'stable';
  subjectStrengths: Array<{ subjectId: string; subjectName: string; averageScore: number }>;
  recentActivity: Array<{
    examId: string;
    examTitle: string;
    score: number;
    date: Date;
  }>;
  lastUpdated: Date;
}

export interface PrecalculatedClassRankings {
  classId: string;
  rankings: Array<{
    rank: number;
    userId: string;
    userName: string;
    averageScore: number;
    totalExams: number;
  }>;
  lastUpdated: Date;
}

export interface PrecalculatedSubjectAnalytics {
  subjectId: string;
  analytics: {
    totalExams: number;
    averageScore: number;
    difficultyTrend: 'easier' | 'harder' | 'stable';
    commonMistakes: Array<{ questionId: string; mistakeCount: number }>;
    performanceByClass: Array<{ classId: string; className: string; averageScore: number }>;
  };
  lastUpdated: Date;
}

// Batch processing configuration
export interface BatchProcessingConfig {
  examStats: {
    enabled: boolean;
    updateInterval: number; // minutes
    batchSize: number;
  };
  studentSummaries: {
    enabled: boolean;
    updateInterval: number; // minutes
    batchSize: number;
  };
  classRankings: {
    enabled: boolean;
    updateInterval: number; // minutes
    batchSize: number;
  };
  subjectAnalytics: {
    enabled: boolean;
    updateInterval: number; // minutes
    batchSize: number;
  };
}

/**
 * Pre-calculated results manager
 * Handles batch processing and caching of commonly requested data
 */
export class PrecalculatedResultsManager {
  private static instance: PrecalculatedResultsManager;
  private config: BatchProcessingConfig;
  private cache: any;
  private processingTimers: Map<string, NodeJS.Timeout> = new Map();
  private isProcessing = false;

  private constructor(config?: Partial<BatchProcessingConfig>) {
    this.config = {
      examStats: {
        enabled: true,
        updateInterval: 30, // 30 minutes
        batchSize: 10
      },
      studentSummaries: {
        enabled: true,
        updateInterval: 60, // 1 hour
        batchSize: 20
      },
      classRankings: {
        enabled: true,
        updateInterval: 15, // 15 minutes
        batchSize: 5
      },
      subjectAnalytics: {
        enabled: true,
        updateInterval: 45, // 45 minutes
        batchSize: 15
      },
      ...config
    };

    this.initializeCache();
    this.startBatchProcessing();
  }

  static getInstance(config?: Partial<BatchProcessingConfig>): PrecalculatedResultsManager {
    if (!PrecalculatedResultsManager.instance) {
      PrecalculatedResultsManager.instance = new PrecalculatedResultsManager(config);
    }
    return PrecalculatedResultsManager.instance;
  }

  private async initializeCache(): Promise<void> {
    this.cache = getRedisCache();
  }

  /**
   * Start batch processing timers
   */
  private startBatchProcessing(): void {
    if (this.config.examStats.enabled) {
      this.startProcessingTimer('examStats', () => this.batchProcessExamStats());
    }

    if (this.config.studentSummaries.enabled) {
      this.startProcessingTimer('studentSummaries', () => this.batchProcessStudentSummaries());
    }

    if (this.config.classRankings.enabled) {
      this.startProcessingTimer('classRankings', () => this.batchProcessClassRankings());
    }

    if (this.config.subjectAnalytics.enabled) {
      this.startProcessingTimer('subjectAnalytics', () => this.batchProcessSubjectAnalytics());
    }

    console.log('Pre-calculated results batch processing started');
  }

  /**
   * Start processing timer for a specific type
   */
  private startProcessingTimer(type: string, processor: () => Promise<void>): void {
    const interval = this.config[type as keyof BatchProcessingConfig].updateInterval * 60 * 1000;

    const timer = setInterval(async () => {
      if (!this.isProcessing) {
        try {
          await processor();
        } catch (error) {
          console.error(`Error in batch processing for ${type}:`, error);
        }
      }
    }, interval);

    this.processingTimers.set(type, timer);

    // Run initial processing
    setImmediate(async () => {
      try {
        await processor();
      } catch (error) {
        console.error(`Error in initial batch processing for ${type}:`, error);
      }
    });
  }

  /**
   * Batch process exam statistics
   */
  private async batchProcessExamStats(): Promise<void> {
    console.log('Starting batch processing of exam statistics...');

    try {
      // Get all exams that have recent results (indicating they're active)
      const recentResults = await db.examResult.findMany({
        where: {
          endTime: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        select: {
          examId: true
        },
        distinct: ['examId'],
        take: this.config.examStats.batchSize
      });

      const examIds = recentResults.map(r => r.examId);

      const exams = await db.exam.findMany({
        where: {
          id: { in: examIds }
        },
        select: {
          id: true,
          title: true
        }
      });

      for (const exam of exams) {
        await this.calculateAndCacheExamStats(exam.id);
      }

      console.log(`Processed statistics for ${exams.length} exams`);
    } catch (error) {
      console.error('Error in batch processing exam stats:', error);
    }
  }

  /**
   * Calculate and cache exam statistics
   */
  private async calculateAndCacheExamStats(examId: string): Promise<void> {
    try {
      // Get all results for this exam
      const results = await db.examResult.findMany({
        where: { examId },
        select: {
          userId: true,
          score: true,
          totalMarks: true,
          percentage: true,
          isCompleted: true
        }
      });

      if (results.length === 0) return;

      // Calculate statistics
      const completedResults = results.filter(r => r.isCompleted);
      const totalStudents = results.length;
      const submittedCount = completedResults.length;
      const completionRate = (submittedCount / totalStudents) * 100;

      const scores = completedResults.map(r => r.percentage);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const medianScore = this.calculateMedian(scores);
      const highestScore = Math.max(...scores);
      const lowestScore = Math.min(...scores);
      const standardDeviation = this.calculateStandardDeviation(scores);

      // Calculate grade distribution
      const gradeDistribution: Record<string, number> = {};
      const gradeRanges = {
        'A+': [95, 100], 'A': [90, 94], 'B+': [85, 89], 'B': [80, 84],
        'C+': [75, 79], 'C': [70, 74], 'D+': [65, 69], 'D': [60, 64], 'F': [0, 59]
      };

      for (const [grade, [min, max]] of Object.entries(gradeRanges)) {
        gradeDistribution[grade] = scores.filter(score => score >= min && score <= max).length;
      }

      const stats: PrecalculatedExamStats = {
        examId,
        totalStudents,
        submittedCount,
        completionRate,
        averageScore,
        medianScore,
        highestScore,
        lowestScore,
        standardDeviation,
        gradeDistribution,
        lastUpdated: new Date()
      };

      // Cache the results
      await this.cache.cacheAnalyticsData(`exam_stats:${examId}`, stats);

      console.log(`Cached statistics for exam ${examId}`);
    } catch (error) {
      console.error(`Error calculating exam stats for ${examId}:`, error);
    }
  }

  /**
   * Batch process student summaries
   */
  private async batchProcessStudentSummaries(): Promise<void> {
    console.log('Starting batch processing of student summaries...');

    try {
      // Get active students (who have taken exams recently)
      const recentStudents = await db.examResult.findMany({
        where: {
          endTime: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        select: { userId: true },
        distinct: ['userId'],
        take: this.config.studentSummaries.batchSize
      });

      for (const student of recentStudents) {
        await this.calculateAndCacheStudentSummary(student.userId);
      }

      console.log(`Processed summaries for ${recentStudents.length} students`);
    } catch (error) {
      console.error('Error in batch processing student summaries:', error);
    }
  }

  /**
   * Calculate and cache student summary
   */
  private async calculateAndCacheStudentSummary(userId: string): Promise<void> {
    try {
      // Get all results for this student
      const results = await db.examResult.findMany({
        where: { userId },
        select: {
          examId: true,
          score: true,
          totalMarks: true,
          percentage: true,
          isCompleted: true,
          endTime: true,
          exam: {
            select: {
              title: true,
              subjectId: true,
              subject: { select: { name: true } }
            }
          }
        },
        orderBy: { endTime: 'desc' },
        take: 20 // Last 20 exams
      });

      if (results.length === 0) return;

      const totalExams = results.length;
      const completedExams = results.filter(r => r.isCompleted).length;
      const completedScores = results.filter(r => r.isCompleted).map(r => r.percentage);
      const averageScore = completedScores.length > 0
        ? completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length
        : 0;

      // Determine overall grade (simplified)
      let overallGrade = 'F';
      if (averageScore >= 90) overallGrade = 'A+';
      else if (averageScore >= 80) overallGrade = 'A';
      else if (averageScore >= 70) overallGrade = 'B';
      else if (averageScore >= 60) overallGrade = 'C';
      else if (averageScore >= 50) overallGrade = 'D';

      // Calculate improvement trend
      const recentScores = completedScores.slice(0, 5);
      const olderScores = completedScores.slice(5, 10);

      let improvementTrend: 'improving' | 'declining' | 'stable' = 'stable';
      if (recentScores.length >= 3 && olderScores.length >= 3) {
        const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
        const olderAvg = olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length;

        if (recentAvg > olderAvg + 5) improvementTrend = 'improving';
        else if (recentAvg < olderAvg - 5) improvementTrend = 'declining';
      }

      // Calculate subject strengths
      const subjectMap = new Map<string, { subjectId: string; subjectName: string; scores: number[] }>();

      for (const result of results) {
        if (result.isCompleted && result.exam.subject) {
          const subjectId = result.exam.subjectId;
          const subjectName = result.exam.subject.name || subjectId;

          if (!subjectMap.has(subjectId)) {
            subjectMap.set(subjectId, { subjectId, subjectName, scores: [] });
          }

          subjectMap.get(subjectId)!.scores.push(result.percentage);
        }
      }

      const subjectStrengths = Array.from(subjectMap.values()).map(subject => ({
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        averageScore: subject.scores.reduce((sum, score) => sum + score, 0) / subject.scores.length
      }));

      // Recent activity
      const recentActivity = results.slice(0, 5).map(result => ({
        examId: result.examId,
        examTitle: result.exam.title,
        score: result.percentage,
        date: result.endTime!
      }));

      const summary: PrecalculatedStudentSummary = {
        userId,
        totalExams,
        completedExams,
        averageScore,
        overallGrade,
        improvementTrend,
        subjectStrengths,
        recentActivity,
        lastUpdated: new Date()
      };

      // Cache the summary
      await this.cache.cacheUserData(userId, summary);

      console.log(`Cached summary for student ${userId}`);
    } catch (error) {
      console.error(`Error calculating student summary for ${userId}:`, error);
    }
  }

  /**
   * Batch process class rankings
   */
  private async batchProcessClassRankings(): Promise<void> {
    console.log('Starting batch processing of class rankings...');

    try {
      // Get all classes that have recent results
      const recentClassResults = await db.examResult.findMany({
        where: {
          endTime: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        select: {
          exam: {
            select: {
              classId: true,
              class: { select: { name: true } }
            }
          }
        },
        distinct: ['examId'],
        take: this.config.classRankings.batchSize
      });

      const classes = recentClassResults
        .filter(r => r.exam.classId)
        .map(r => ({
          id: r.exam.classId!,
          name: r.exam.class?.name || 'Unknown Class'
        }))
        .filter((value, index, self) =>
          index === self.findIndex(c => c.id === value.id)
        ); // Remove duplicates

      for (const classInfo of classes) {
        await this.calculateAndCacheClassRankings(classInfo.id);
      }

      console.log(`Processed rankings for ${classes.length} classes`);
    } catch (error) {
      console.error('Error in batch processing class rankings:', error);
    }
  }

  /**
   * Calculate and cache class rankings
   */
  private async calculateAndCacheClassRankings(classId: string): Promise<void> {
    try {
      // Get all students in this class with their average scores
      const studentResults = await db.examResult.groupBy({
        by: ['userId'],
        where: {
          exam: { classId }
        },
        _avg: {
          percentage: true
        },
        _count: {
          _all: true
        }
      });

      // Get user details
      const userIds = studentResults.map(r => r.userId);
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true }
      });

      const userMap = new Map(users.map(u => [u.id, u.name]));

      // Create rankings
      const rankings = studentResults
        .map(result => ({
          rank: 0, // Will be set after sorting
          userId: result.userId,
          userName: userMap.get(result.userId) || 'Unknown',
          averageScore: result._avg.percentage || 0,
          totalExams: result._count._all
        }))
        .filter(r => r.totalExams > 0) // Only include students with exam results
        .sort((a, b) => b.averageScore - a.averageScore)
        .map((ranking, index) => ({ ...ranking, rank: index + 1 }));

      const classRankings: PrecalculatedClassRankings = {
        classId,
        rankings,
        lastUpdated: new Date()
      };

      // Cache the rankings
      await this.cache.cacheAnalyticsData(`class_rankings:${classId}`, classRankings);

      console.log(`Cached rankings for class ${classId}`);
    } catch (error) {
      console.error(`Error calculating class rankings for ${classId}:`, error);
    }
  }

  /**
   * Batch process subject analytics
   */
  private async batchProcessSubjectAnalytics(): Promise<void> {
    console.log('Starting batch processing of subject analytics...');

    try {
      // Get all subjects that have recent results
      const recentSubjectResults = await db.examResult.findMany({
        where: {
          endTime: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        select: {
          exam: {
            select: {
              subjectId: true,
              subject: { select: { name: true } }
            }
          }
        },
        distinct: ['examId'],
        take: this.config.subjectAnalytics.batchSize
      });

      const subjects = recentSubjectResults
        .filter(r => r.exam.subjectId)
        .map(r => ({
          id: r.exam.subjectId!,
          name: r.exam.subject?.name || 'Unknown Subject'
        }))
        .filter((value, index, self) =>
          index === self.findIndex(s => s.id === value.id)
        ); // Remove duplicates

      for (const subject of subjects) {
        await this.calculateAndCacheSubjectAnalytics(subject.id);
      }

      console.log(`Processed analytics for ${subjects.length} subjects`);
    } catch (error) {
      console.error('Error in batch processing subject analytics:', error);
    }
  }

  /**
   * Calculate and cache subject analytics
   */
  private async calculateAndCacheSubjectAnalytics(subjectId: string): Promise<void> {
    try {
      // Get exam results for this subject
      const results = await db.examResult.findMany({
        where: {
          exam: { subjectId }
        },
        select: {
          percentage: true,
          exam: {
            select: {
              classId: true,
              class: { select: { name: true } }
            }
          }
        }
      });

      if (results.length === 0) return;

      const totalExams = results.length;
      const scores = results.map(r => r.percentage);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      // Performance by class
      const classMap = new Map<string, { classId: string; className: string; scores: number[] }>();

      for (const result of results) {
        if (result.exam.classId && result.exam.class) {
          const classId = result.exam.classId!;
          const className = result.exam.class.name || 'Unknown Class';

          if (!classMap.has(classId)) {
            classMap.set(classId, { classId, className, scores: [] });
          }

          const classInfo = classMap.get(classId)!;
          classInfo.scores.push(result.percentage);
        }
      }

      const performanceByClass = Array.from(classMap.values()).map(classInfo => ({
        classId: classInfo.classId,
        className: classInfo.className,
        averageScore: classInfo.scores.reduce((sum, score) => sum + score, 0) / classInfo.scores.length
      }));

      const analytics: PrecalculatedSubjectAnalytics = {
        subjectId,
        analytics: {
          totalExams,
          averageScore,
          difficultyTrend: 'stable', // Would require historical data to calculate
          commonMistakes: [], // Would require question-level analysis
          performanceByClass
        },
        lastUpdated: new Date()
      };

      // Cache the analytics
      await this.cache.cacheAnalyticsData(`subject_analytics:${subjectId}`, analytics);

      console.log(`Cached analytics for subject ${subjectId}`);
    } catch (error) {
      console.error(`Error calculating subject analytics for ${subjectId}:`, error);
    }
  }

  // Public API methods

  /**
   * Get pre-calculated exam statistics
   */
  async getExamStats(examId: string): Promise<PrecalculatedExamStats | null> {
    const cached = await this.cache.getCachedAnalyticsData(`exam_stats:${examId}`);
    return cached || null;
  }

  /**
   * Get pre-calculated student summary
   */
  async getStudentSummary(userId: string): Promise<PrecalculatedStudentSummary | null> {
    const cached = await this.cache.getCachedUserData(userId);
    return cached || null;
  }

  /**
   * Get pre-calculated class rankings
   */
  async getClassRankings(classId: string): Promise<PrecalculatedClassRankings | null> {
    const cached = await this.cache.getCachedAnalyticsData(`class_rankings:${classId}`);
    return cached || null;
  }

  /**
   * Get pre-calculated subject analytics
   */
  async getSubjectAnalytics(subjectId: string): Promise<PrecalculatedSubjectAnalytics | null> {
    const cached = await this.cache.getCachedAnalyticsData(`subject_analytics:${subjectId}`);
    return cached || null;
  }

  /**
   * Force refresh of all pre-calculated data
   */
  async forceRefresh(): Promise<void> {
    console.log('Forcing refresh of all pre-calculated data...');

    await Promise.all([
      this.batchProcessExamStats(),
      this.batchProcessStudentSummaries(),
      this.batchProcessClassRankings(),
      this.batchProcessSubjectAnalytics()
    ]);

    console.log('All pre-calculated data refreshed');
  }

  /**
   * Get processing status
   */
  getProcessingStatus(): {
    isProcessing: boolean;
    activeTimers: string[];
    config: BatchProcessingConfig;
  } {
    return {
      isProcessing: this.isProcessing,
      activeTimers: Array.from(this.processingTimers.keys()),
      config: this.config
    };
  }

  /**
   * Update batch processing configuration
   */
  updateConfig(newConfig: Partial<BatchProcessingConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart timers with new configuration
    this.stopBatchProcessing();
    this.startBatchProcessing();

    console.log('Batch processing configuration updated');
  }

  /**
   * Stop batch processing
   */
  private stopBatchProcessing(): void {
    for (const timer of this.processingTimers.values()) {
      clearInterval(timer);
    }
    this.processingTimers.clear();
    console.log('Batch processing stopped');
  }

  // Helper methods

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }
}

// Singleton instance
export const precalculatedResults = PrecalculatedResultsManager.getInstance();

// Graceful shutdown
process.on('SIGTERM', async () => {
  precalculatedResults['stopBatchProcessing']();
});

process.on('SIGINT', async () => {
  precalculatedResults['stopBatchProcessing']();
});
