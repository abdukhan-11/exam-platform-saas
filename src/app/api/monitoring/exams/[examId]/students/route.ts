import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { ExamSessionManager } from '@/lib/exams/exam-session-manager';
import { CheatingDetectionService } from '@/lib/security/cheating-detection';
import { getConnectedUsers } from '@/lib/socket-server';

// const examSessionManager = ExamSessionManager.getInstance(); // Not used in this file
const cheatingDetectionService = CheatingDetectionService.getInstance();

/**
 * GET /api/monitoring/exams/[examId]/students
 * Get connected students and their session information
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
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
    if (!PermissionService.hasAnyPermission(currentUser.role, [
      Permission.READ_EXAM,
      Permission.UPDATE_EXAM
    ])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { examId } = await params;

    // Verify exam exists and user has access
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: { college: true }
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get connected users for this exam
    const connectedUsers = getConnectedUsers()
      .filter(user => user.examId === examId);

    // Get student details and session information
    const studentsData = await Promise.all(
      connectedUsers.map(async (connectedUser) => {
        const [user, profile, attempt] = await Promise.all([
          db.user.findUnique({
            where: { id: connectedUser.userId },
            select: {
              id: true,
              name: true,
              email: true,
              rollNo: true
            }
          }),
          db.studentProfile.findUnique({
            where: { userId: connectedUser.userId },
            select: {
              rollNo: true,
              fatherName: true,
              phone: true
            }
          }),
          db.studentExamAttempt.findUnique({
            where: {
              userId_examId: {
                userId: connectedUser.userId,
                examId
              }
            }
          })
        ]);

        if (!user) return null;

        // Get student alerts
        const alerts = await cheatingDetectionService.getStudentAlerts(examId, connectedUser.userId);

        return {
          userId: user.id,
          name: user.name,
          email: user.email,
          rollNo: user.rollNo || profile?.rollNo,
          phone: profile?.phone,
          fatherName: profile?.fatherName,
          session: {
            connectedAt: connectedUser.connectedAt,
            lastActivity: connectedUser.lastActivity,
            status: attempt?.isCompleted ? 'completed' :
                   connectedUser.lastActivity.getTime() < Date.now() - (5 * 60 * 1000) ? 'inactive' : 'active'
          },
          progress: attempt ? {
            score: attempt.score,
            totalMarks: attempt.totalMarks,
            isCompleted: attempt.isCompleted,
            startedAt: attempt.startedAt,
            endedAt: attempt.endedAt,
            timeSpent: attempt.endedAt ?
              Math.floor((attempt.endedAt.getTime() - attempt.startedAt.getTime()) / 1000) :
              Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000)
          } : null,
          alerts: {
            total: alerts.length,
            critical: alerts.filter(a => a.severity === 'critical').length,
            high: alerts.filter(a => a.severity === 'high').length,
            latest: alerts.slice(-3) // Last 3 alerts
          }
        };
      })
    );

    // Filter out null values and sort by connection time
    const validStudents = studentsData
      .filter(student => student !== null)
      .sort((a, b) => b!.session.connectedAt.getTime() - a!.session.connectedAt.getTime());

    // Get summary statistics
    const summary = {
      totalConnected: validStudents.length,
      active: validStudents.filter(s => s.session.status === 'active').length,
      inactive: validStudents.filter(s => s.session.status === 'inactive').length,
      completed: validStudents.filter(s => s.progress?.isCompleted).length,
      withAlerts: validStudents.filter(s => s.alerts.total > 0).length,
      averageTimeSpent: validStudents.length > 0
        ? Math.floor(validStudents.reduce((sum, s) => sum + (s.progress?.timeSpent || 0), 0) / validStudents.length)
        : 0
    };

    return NextResponse.json({
      examId,
      summary,
      students: validStudents
    });

  } catch (error) {
    console.error('Error fetching connected students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connected students' },
      { status: 500 }
    );
  }
}
