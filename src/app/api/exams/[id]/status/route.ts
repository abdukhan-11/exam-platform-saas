import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const currentUser = session.user as any;
    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.READ_EXAM])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    
    // Find the exam and validate access
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        subject: true,
        class: true,
        questions: {
          include: {
            questionOptions: true
          }
        },
        attempts: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                rollNo: true
              }
            }
          }
        },
        examResults: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
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

    const now = new Date();
    
    // Determine exam status
    let status = 'draft';
    let statusDetails = {
      isPublished: exam.isPublished,
      isActive: exam.isActive,
      isScheduled: exam.startTime > now,
      isInProgress: exam.startTime <= now && exam.endTime > now,
      isCompleted: exam.endTime <= now,
      isOverdue: exam.endTime < now && exam.attempts.some(attempt => !attempt.isCompleted)
    };

    if (exam.isPublished && exam.isActive) {
      if (exam.startTime > now) {
        status = 'scheduled';
      } else if (exam.startTime <= now && exam.endTime > now) {
        status = 'in_progress';
      } else if (exam.endTime <= now) {
        status = 'completed';
      }
    } else if (exam.isPublished && !exam.isActive) {
      status = 'published';
    } else if (!exam.isPublished) {
      status = 'draft';
    }

    // Calculate statistics
    const totalAttempts = exam.attempts.length;
    const completedAttempts = exam.attempts.filter(attempt => attempt.isCompleted).length;
    const inProgressAttempts = exam.attempts.filter(attempt => !attempt.isCompleted).length;
    const averageScore = exam.examResults.length > 0 
      ? exam.examResults.reduce((sum, result) => sum + result.percentage, 0) / exam.examResults.length 
      : 0;
    const passRate = exam.examResults.length > 0 
      ? (exam.examResults.filter(result => result.percentage >= (exam.passingMarks / exam.totalMarks * 100)).length / exam.examResults.length) * 100 
      : 0;

    // Get recent activity
    const recentActivity = await db.activityLog.findMany({
      where: { 
        action: {
          in: ['EXAM_PUBLISHED', 'EXAM_ACTIVATED', 'EXAM_DEACTIVATED', 'EXAM_UNPUBLISHED']
        },
        details: {
          path: ['examId'],
          equals: id
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Calculate time remaining
    let timeRemaining = null;
    if (status === 'in_progress') {
      timeRemaining = Math.max(0, exam.endTime.getTime() - now.getTime());
    } else if (status === 'scheduled') {
      timeRemaining = exam.startTime.getTime() - now.getTime();
    }

    const response = {
      examId: exam.id,
      title: exam.title,
      status,
      statusDetails,
      timing: {
        startTime: exam.startTime,
        endTime: exam.endTime,
        duration: exam.duration,
        timeRemaining,
        isOverdue: statusDetails.isOverdue
      },
      statistics: {
        totalQuestions: exam.questions.length,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        totalAttempts,
        completedAttempts,
        inProgressAttempts,
        averageScore: Math.round(averageScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100
      },
      participants: {
        total: totalAttempts,
        completed: completedAttempts,
        inProgress: inProgressAttempts,
                 recentAttempts: exam.attempts.slice(-5).map(attempt => ({
           id: attempt.id,
           userId: attempt.userId,
           userName: attempt.user.name,
           userEmail: attempt.user.email,
           userRollNo: attempt.user.rollNo,
           isCompleted: attempt.isCompleted,
           startedAt: attempt.startedAt,
           endedAt: attempt.endedAt
         }))
      },
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        action: activity.action,
        details: activity.details,
        createdAt: activity.createdAt,
        user: activity.user
      })),
      metadata: {
        lastUpdated: exam.updatedAt,
        createdAt: exam.createdAt,
        createdBy: exam.createdById
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching exam status:', error);
    return NextResponse.json({ error: 'Failed to fetch exam status' }, { status: 500 });
  }
}
