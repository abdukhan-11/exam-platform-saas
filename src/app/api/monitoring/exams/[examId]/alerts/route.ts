import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { CheatingDetectionService } from '@/lib/security/cheating-detection';
import { CheatingAlert } from '@/lib/types/exam-monitoring';
import { z } from 'zod';
import { consumeRateLimit } from '@/lib/security/rate-limit';

const cheatingDetectionService = CheatingDetectionService.getInstance();

/**
 * GET /api/monitoring/exams/[examId]/alerts
 * Get cheating alerts for an exam
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const rate = consumeRateLimit({
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      identifier: params.examId,
      category: 'examOps'
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Validate params and query
    const ParamsSchema = z.object({ examId: z.string().min(1) });
    const QuerySchema = z.object({
      limit: z.coerce.number().int().min(1).max(200).optional(),
      offset: z.coerce.number().int().min(0).optional(),
      severity: z.enum(['low','medium','high','critical']).optional(),
      studentId: z.string().optional()
    });
    const paramsOk = ParamsSchema.safeParse(params);
    if (!paramsOk.success) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    const url = new URL(req.url);
    const queryObj = Object.fromEntries(url.searchParams.entries());
    const queryOk = QuerySchema.safeParse(queryObj);
    if (!queryOk.success) {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
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
      include: { college: true }
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const { limit = 50, offset = 0, severity = null, studentId = undefined } = queryOk.data as any;

    // Get alerts from the detection service
    let alerts = await cheatingDetectionService.getExamAlerts(params.examId);

    // Apply filters
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    if (studentId) {
      alerts = alerts.filter(alert => alert.userId === studentId);
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const totalAlerts = alerts.length;
    const paginatedAlerts = alerts.slice(offset, offset + limit);

    // Enrich alerts with student information
    const enrichedAlerts = await Promise.all(
      paginatedAlerts.map(async (alert) => {
        const [user, profile] = await Promise.all([
          db.user.findUnique({
            where: { id: alert.userId },
            select: {
              id: true,
              name: true,
              email: true,
              rollNo: true
            }
          }),
          db.studentProfile.findUnique({
            where: { userId: alert.userId },
            select: {
              rollNo: true,
              phone: true
            }
          })
        ]);

        return {
          ...alert,
          student: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            rollNo: user.rollNo || profile?.rollNo
          } : null,
          examId: params.examId,
          examTitle: exam.title
        };
      })
    );

    // Get summary statistics
    const allAlerts = await cheatingDetectionService.getExamAlerts(params.examId);
    const summary = {
      total: allAlerts.length,
      bySeverity: groupAlertsBySeverity(allAlerts as CheatingAlert[]),
      byPattern: groupAlertsByPattern(allAlerts as CheatingAlert[]),
      recentCount: allAlerts.filter(alert => {
        const alertTime = new Date(alert.timestamp).getTime();
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        return alertTime > oneHourAgo;
      }).length,
      criticalCount: allAlerts.filter(alert => alert.severity === 'critical').length
    };

    return NextResponse.json({
      examId: params.examId,
      summary,
      pagination: {
        total: totalAlerts,
        limit,
        offset,
        hasMore: offset + limit < totalAlerts
      },
      alerts: enrichedAlerts
    });

  } catch (error) {
    console.error('Error fetching exam alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exam alerts' },
      { status: 500 }
    );
  }
}

// Helper functions
function groupAlertsBySeverity(alerts: CheatingAlert[]): Record<string, number> {
  return alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function groupAlertsByPattern(alerts: CheatingAlert[]): Record<string, number> {
  return alerts.reduce((acc, alert) => {
    acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
