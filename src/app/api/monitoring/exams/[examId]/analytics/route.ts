import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { ExamSessionManager } from '@/lib/exams/exam-session-manager';
import { CheatingDetectionService } from '@/lib/security/cheating-detection';
import { ExamData, ExamStatus, CheatingAlert } from '@/lib/types/exam-monitoring';
import { z } from 'zod';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { getRedisCache } from '@/lib/cache/redis-cache';

const examSessionManager = ExamSessionManager.getInstance();
const cheatingDetectionService = CheatingDetectionService.getInstance();

/**
 * GET /api/monitoring/exams/[examId]/analytics
 * Get real-time analytics data for exam monitoring
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const rate = consumeRateLimit({
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      identifier: examId,
      category: 'general'
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const ParamsSchema = z.object({ examId: z.string().min(1) });
    const ok = ParamsSchema.safeParse({ examId });
    if (!ok.success) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUser = session.user as {
      id: string;
      role: string;
      collegeId?: string;
    };

    // Check permissions
    if (!PermissionService.hasAnyPermission(currentUser.role as any, [
      Permission.READ_EXAM,
      Permission.UPDATE_EXAM
    ])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify exam exists and user has access
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        college: true,
        subject: true,
        questions: {
          select: {
            id: true,
            marks: true,
            difficulty: true,
            type: true
          }
        },
        attempts: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                rollNo: true
              }
            }
          }
        }
      }
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Try cache first for analytics payload
    const cache = getRedisCache();
    const cacheKey = `analytics:${examId}`;
    const cached = await cache.getCachedAnalyticsData(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Get real-time session data
    const examStatus = await examSessionManager.getExamStatus(examId);
    const activeSessions = examSessionManager.getActiveSessions(examId);

    // Get alerts data
    const alerts = await cheatingDetectionService.getExamAlerts(examId);

    // Calculate comprehensive analytics
    // Map Prisma exam to ExamData shape expected by analytics helpers
    const mappedExam: ExamData = {
      id: exam.id,
      title: exam.title,
      subject: exam.subject?.name || 'Unknown',
      startTime: exam.startTime,
      endTime: exam.endTime,
      duration: exam.duration,
      totalMarks: (exam as any).questions.reduce((sum: number, q: any) => sum + q.marks, 0),
      totalQuestions: (exam as any).questions.length,
      attempts: exam.attempts.map((a: any) => ({
        userId: a.user.id,
        score: a.score,
        isCompleted: a.isCompleted,
        endedAt: a.endedAt
      }))
    };

    const analytics = await calculateAnalytics(mappedExam, examStatus, activeSessions, alerts as CheatingAlert[]);

    const payload = {
      examId,
      timestamp: new Date().toISOString(),
      ...analytics
    };

    await cache.cacheAnalyticsData(cacheKey, payload);
    return NextResponse.json(payload);

  } catch (error) {
    console.error('Error fetching exam analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exam analytics' },
      { status: 500 }
    );
  }
}

// Helper functions
async function calculateAnalytics(exam: ExamData, examStatus: ExamStatus, activeSessions: any[], alerts: CheatingAlert[]) {
  // Student engagement metrics
  const engagementMetrics = calculateEngagementMetrics(exam, activeSessions);

  // Performance analytics
  const performanceAnalytics = calculatePerformanceAnalytics(exam);

  // Cheating detection analytics
  const cheatingAnalytics = calculateCheatingAnalytics(alerts);

  // Time-based analytics
  const timeAnalytics = calculateTimeAnalytics(exam, activeSessions);

  // Question-wise analytics
  const questionAnalytics = calculateQuestionAnalytics(exam);

  // Predictive analytics
  const predictiveAnalytics = calculatePredictiveAnalytics(exam, examStatus);

  return {
    engagement: engagementMetrics,
    performance: performanceAnalytics,
    cheating: cheatingAnalytics,
    time: timeAnalytics,
    questions: questionAnalytics,
    predictive: predictiveAnalytics,
    summary: {
      status: getExamStatus(exam.startTime, exam.endTime),
      timeRemaining: examStatus.timeRemaining,
      completionRate: examStatus.totalStudents > 0
        ? (examStatus.completedStudents / examStatus.totalStudents) * 100
        : 0,
      alertRate: examStatus.totalStudents > 0
        ? (alerts.length / examStatus.totalStudents) * 100
        : 0
    }
  };
}

/**
 * Calculate engagement metrics
 */
function calculateEngagementMetrics(exam: ExamData, activeSessions: any[]) {
  const totalStudents = exam.attempts.length;
  const activeStudents = activeSessions.length;

  return {
    participationRate: totalStudents > 0 ? (activeStudents / totalStudents) * 100 : 0,
    averageSessionDuration: calculateAverageSessionDuration(activeSessions),
    peakConcurrentUsers: activeStudents, // Current peak
    dropOffRate: calculateDropOffRate(exam.attempts),
    engagementScore: calculateEngagementScore(activeSessions, totalStudents)
  };
}

/**
 * Calculate performance analytics
 */
function calculatePerformanceAnalytics(exam: ExamData) {
  const completedAttempts = (exam as any).attempts.filter((a: any) => a.isCompleted);

  if (completedAttempts.length === 0) {
    return {
      averageScore: 0,
      medianScore: 0,
      scoreDistribution: {},
      passRate: 0,
      highPerformers: 0,
      lowPerformers: 0
    };
  }

  const scores = completedAttempts.map((a: any) => a.score || 0);
  const averageScore = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
  const medianScore = calculateMedian(scores);

  const totalMarks = (exam as any).totalMarks ?? (exam as any).questions.reduce((sum: number, q: any) => sum + q.marks, 0);
  const passingMarks = (exam as any).passingMarks ?? 0;

  const passRate = (scores.filter((score: number) => score >= passingMarks).length / scores.length) * 100;

  const scoreRanges = {
    '0-20': scores.filter((s: number) => s >= 0 && s < 20).length,
    '20-40': scores.filter((s: number) => s >= 20 && s < 40).length,
    '40-60': scores.filter((s: number) => s >= 40 && s < 60).length,
    '60-80': scores.filter((s: number) => s >= 60 && s < 80).length,
    '80-100': scores.filter((s: number) => s >= 80 && s <= 100).length
  };

  return {
    averageScore: Math.round(averageScore),
    medianScore: Math.round(medianScore),
    scoreDistribution: scoreRanges,
    passRate: Math.round(passRate),
    highPerformers: scores.filter((s: number) => s >= 80).length,
    lowPerformers: scores.filter((s: number) => s < passingMarks).length,
    totalMarks
  };
}

/**
 * Calculate cheating analytics
 */
function calculateCheatingAnalytics(alerts: CheatingAlert[]) {
  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const highAlerts = alerts.filter(a => a.severity === 'high').length;

  // Group by pattern
  const patternDistribution = alerts.reduce((acc: Record<string, number>, alert: any) => {
    acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
    return acc;
  }, {});

  // Calculate risk scores
  const riskMetrics = {
    overallRiskScore: calculateRiskScore(alerts),
    patternsDetected: Object.keys(patternDistribution).length,
    mostCommonPattern: getMostCommonPattern(patternDistribution),
    alertFrequency: totalAlerts > 0 ? totalAlerts / 24 : 0 // alerts per hour
  };

  return {
    totalAlerts,
    criticalAlerts,
    highAlerts,
    patternDistribution,
    riskMetrics
  };
}

/**
 * Calculate time-based analytics
 */
function calculateTimeAnalytics(exam: ExamData, activeSessions: any[]) {
  const now = new Date();
  const examDuration = exam.duration * 60 * 1000; // Convert to milliseconds
  const timeElapsed = now.getTime() - exam.startTime.getTime();
  const progressPercentage = Math.min((timeElapsed / examDuration) * 100, 100);

  return {
    timeElapsed: Math.floor(timeElapsed / (1000 * 60)), // minutes
    timeRemaining: Math.max(0, Math.floor((exam.endTime.getTime() - now.getTime()) / (1000 * 60))),
    progressPercentage: Math.round(progressPercentage),
    averageTimePerQuestion: calculateAverageTimePerQuestion(activeSessions, (exam as any).questions?.length || 0),
    completionTimeline: generateCompletionTimeline(exam.attempts)
  };
}

/**
 * Calculate question-wise analytics
 */
function calculateQuestionAnalytics(exam: ExamData) {
  const questions: Array<{ marks: number; difficulty?: string; type?: string }> = (exam as any).questions || [];

  const difficultyDistribution = questions.reduce((acc: Record<string, number>, q: any) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {});

  const typeDistribution = questions.reduce((acc: Record<string, number>, q: any) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {});

  return {
    totalQuestions: questions.length,
    difficultyDistribution,
    typeDistribution,
    averageMarksPerQuestion: questions.length > 0
      ? questions.reduce((sum: number, q: any) => sum + q.marks, 0) / questions.length
      : 0
  };
}

/**
 * Calculate predictive analytics
 */
function calculatePredictiveAnalytics(exam: ExamData, examStatus: ExamStatus) {
  const completionRate = examStatus.totalStudents > 0
    ? (examStatus.completedStudents / examStatus.totalStudents) * 100
    : 0;

  // Simple predictive calculations
  const predictedCompletion = predictFinalCompletion(completionRate, examStatus.timeRemaining);
  const riskLevel = assessExamRisk(examStatus.alertsCount, completionRate);

  return {
    predictedCompletionRate: Math.round(predictedCompletion),
    riskLevel,
    recommendations: generateRecommendations(riskLevel, examStatus)
  };
}

// Helper methods

function calculateAverageSessionDuration(sessions: any[]): number {
  if (sessions.length === 0) return 0;

  const totalDuration = sessions.reduce((sum, session) => {
    const duration = Date.now() - session.startedAt.getTime();
    return sum + duration;
  }, 0);

  return Math.floor(totalDuration / sessions.length / (1000 * 60)); // minutes
}

function calculateDropOffRate(attempts: Array<{ isCompleted: boolean }>): number {
  const started = attempts.length;
  const completed = attempts.filter(a => a.isCompleted).length;

  return started > 0 ? ((started - completed) / started) * 100 : 0;
}

function calculateEngagementScore(activeSessions: any[], totalStudents: number): number {
  if (totalStudents === 0) return 0;

  const activityScore = (activeSessions.length / totalStudents) * 100;
  const averageDuration = calculateAverageSessionDuration(activeSessions);
  const durationScore = Math.min((averageDuration / 30) * 100, 100); // Max score for 30+ minutes

  return Math.round((activityScore + durationScore) / 2);
}

function calculateMedian(numbers: number[]): number {
  const sorted = numbers.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function calculateRiskScore(alerts: CheatingAlert[]): number {
  const weights = { low: 1, medium: 2, high: 3, critical: 4 };
  const totalScore = alerts.reduce((sum, alert) => sum + weights[alert.severity], 0);
  return alerts.length > 0 ? Math.min(totalScore / alerts.length, 10) : 0;
}

function getMostCommonPattern(patternDistribution: Record<string, number>): string {
  return Object.entries(patternDistribution)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';
}

function getExamStatus(startTime: Date, endTime: Date): 'upcoming' | 'active' | 'completed' {
  const now = new Date();
  if (now < startTime) return 'upcoming';
  if (now >= startTime && now <= endTime) return 'active';
  return 'completed';
}

function calculateAverageTimePerQuestion(sessions: any[], questionCount: number): number {
  if (sessions.length === 0 || questionCount === 0) return 0;

  const totalTime = sessions.reduce((sum: number, session: any) => {
    return sum + (Date.now() - new Date(session.startedAt).getTime());
  }, 0);

  return Math.floor((totalTime / sessions.length) / questionCount / 1000); // seconds per question
}

function generateCompletionTimeline(attempts: Array<{ endedAt: Date | null; isCompleted: boolean }>): Array<{ timeSlot: string; completions: number }> {
  // Group completions by time intervals
  const timeline: Record<string, number> = {};

  attempts.filter(a => a.isCompleted && a.endedAt).forEach(attempt => {
    const hour = (attempt.endedAt as Date).getHours();
    const timeSlot = `${hour}:00-${hour + 1}:00`;
    timeline[timeSlot] = (timeline[timeSlot] || 0) + 1;
  });

  return Object.entries(timeline).map(([timeSlot, count]) => ({
    timeSlot,
    completions: count
  }));
}

function predictFinalCompletion(currentRate: number, timeRemaining: number): number {
  // Simple linear prediction based on current completion rate
  if (timeRemaining <= 0) return currentRate;

  const timeProgress = Math.min(1, (Date.now() - new Date().getTime()) / (timeRemaining * 60 * 1000));
  const predictedAdditional = currentRate * (1 - timeProgress);

  return Math.min(currentRate + predictedAdditional, 100);
}

function assessExamRisk(alertCount: number, completionRate: number): 'low' | 'medium' | 'high' | 'critical' {
  if (alertCount > 20 || completionRate < 30) return 'critical';
  if (alertCount > 10 || completionRate < 50) return 'high';
  if (alertCount > 5 || completionRate < 70) return 'medium';
  return 'low';
}

function generateRecommendations(riskLevel: string, examStatus: any): string[] {
  const recommendations: string[] = [];

  switch (riskLevel) {
    case 'critical':
      recommendations.push('Immediate intervention required - high cheating activity detected');
      recommendations.push('Consider extending exam time or providing additional supervision');
      break;
    case 'high':
      recommendations.push('Monitor students with multiple alerts closely');
      recommendations.push('Review exam questions for potential issues');
      break;
    case 'medium':
      recommendations.push('Continue monitoring for suspicious activity');
      recommendations.push('Ensure all students have stable internet connection');
      break;
    case 'low':
      recommendations.push('Exam proceeding normally');
      break;
  }

  if (examStatus.averageProgress < 30) {
    recommendations.push('Many students are behind - consider checking for technical issues');
  }

  return recommendations;
}
