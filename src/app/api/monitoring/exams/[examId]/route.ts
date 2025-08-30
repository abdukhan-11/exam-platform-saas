import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { ExamSessionManager } from '@/lib/exams/exam-session-manager';
import { CheatingDetectionService } from '@/lib/security/cheating-detection';
import { getConnectedUsersCount } from '@/lib/socket-server';
import { z } from 'zod';
import { consumeRateLimit } from '@/lib/security/rate-limit';

const examSessionManager = ExamSessionManager.getInstance();
const cheatingDetectionService = CheatingDetectionService.getInstance();

/**
 * GET /api/monitoring/exams/[examId]
 * Get real-time exam monitoring data
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    // Rate limit per exam for monitoring endpoint
    const rate = consumeRateLimit({
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      identifier: params.examId,
      category: 'examOps'
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Validate params
    const ParamsSchema = z.object({ examId: z.string().min(1) });
    const validParams = ParamsSchema.safeParse(params);
    if (!validParams.success) {
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
      where: { id: params.examId },
      include: {
        subject: true,
        college: true,
        questions: { select: { id: true, marks: true } },
        attempts: {
          where: { isCompleted: true },
          select: { id: true, score: true, isCompleted: true }
        }
      }
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get real-time monitoring data
    const examStatus = await examSessionManager.getExamStatus(params.examId);
    const alerts = await cheatingDetectionService.getExamAlerts(params.examId);
    const connectedUsers = getConnectedUsersCount(params.examId);

    // Calculate additional metrics
    const totalQuestions = exam.questions.length;
    const totalMarks = exam.questions.reduce((sum, q) => sum + q.marks, 0);
    const completedAttempts = exam.attempts.filter(a => a.isCompleted).length;
    const averageScore = completedAttempts > 0
      ? exam.attempts.reduce((sum, a) => sum + (a.score || 0), 0) / completedAttempts
      : 0;

    // Get recent alerts (last 24 hours)
    const recentAlerts = alerts.filter(alert => {
      const alertTime = new Date(alert.timestamp).getTime();
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      return alertTime > oneDayAgo;
    });

    const response = {
      exam: {
        id: exam.id,
        title: exam.title,
        subject: exam.subject.name,
        startTime: exam.startTime,
        endTime: exam.endTime,
        duration: exam.duration,
        totalMarks,
        totalQuestions,
        status: getExamStatus(exam.startTime, exam.endTime)
      },
      realTime: {
        connectedStudents: connectedUsers,
        activeStudents: examStatus.activeStudents,
        completedStudents: examStatus.completedStudents,
        disconnectedStudents: examStatus.disconnectedStudents,
        averageProgress: examStatus.averageProgress,
        alertsCount: examStatus.alertsCount
      },
      summary: {
        totalEnrolled: examStatus.totalStudents,
        completionRate: examStatus.totalStudents > 0
          ? (examStatus.completedStudents / examStatus.totalStudents) * 100
          : 0,
        averageScore: Math.round(averageScore),
        timeRemaining: examStatus.timeRemaining
      },
      alerts: {
        total: alerts.length,
        recent: recentAlerts.length,
        bySeverity: groupAlertsBySeverity(recentAlerts),
        latest: recentAlerts.slice(-5) // Last 5 alerts
      },
      performance: {
        cacheHitRate: 0, // Would be populated by performance monitor
        responseTime: 0,
        errorRate: 0
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching exam monitoring data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}

// Helper functions
function getExamStatus(startTime: Date, endTime: Date): 'upcoming' | 'active' | 'completed' {
  const now = new Date();

  if (now < startTime) {
    return 'upcoming';
  } else if (now >= startTime && now <= endTime) {
    return 'active';
  } else {
    return 'completed';
  }
}

function groupAlertsBySeverity(alerts: Array<{ severity: string }>): Record<string, number> {
  return alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
