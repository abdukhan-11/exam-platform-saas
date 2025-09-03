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
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const currentUser = session.user as any;
    const { id } = await params;

    // Check permissions
    if (!PermissionService.hasPermission(currentUser.role, Permission.READ_EXAM)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get exam details
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        subject: true,
        class: true,
        college: true
      }
    });

    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    
    // Check college access
    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const isActive = now >= exam.startTime && now <= exam.endTime;
    const isUpcoming = now < exam.startTime;
    const isCompleted = now > exam.endTime;

    // Get live statistics
    const [
      totalAttempts,
      completedAttempts,
      inProgressAttempts,
      averageScore,
      recentSubmissions
    ] = await Promise.all([
      // Total attempts
      db.studentExamAttempt.count({
        where: { examId: id }
      }),
      
      // Completed attempts
      db.studentExamAttempt.count({
        where: { 
          examId: id,
          isCompleted: true
        }
      }),
      
      // In progress attempts
      db.studentExamAttempt.count({
        where: { 
          examId: id,
          isCompleted: false,
          startedAt: {
            not: undefined
          }
        }
      }),
      
      // Average score
      db.studentExamAttempt.aggregate({
        where: { 
          examId: id,
          isCompleted: true,
          totalMarks: { gt: 0 }
        },
        _avg: {
          score: true
        }
      }),
      
      // Recent submissions (last 10)
      db.studentExamAttempt.findMany({
        where: { 
          examId: id,
          isCompleted: true
        },
        include: {
          user: {
            select: {
              name: true,
              rollNo: true
            }
          }
        },
        orderBy: { endedAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate completion rate
    const completionRate = totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0;
    
    // Calculate average percentage
    const avgPercentage = averageScore._avg.score && exam.totalMarks 
      ? (averageScore._avg.score / exam.totalMarks) * 100 
      : 0;

    // Get class enrollment count for participation rate
    const totalEnrolled = exam.classId 
      ? await db.enrollment.count({
          where: { 
            classId: exam.classId,
            status: 'ACTIVE'
          }
        })
      : 0;

    const participationRate = totalEnrolled > 0 ? (totalAttempts / totalEnrolled) * 100 : 0;

    // Format recent submissions
    const formattedSubmissions = recentSubmissions.map(attempt => ({
      id: attempt.id,
      studentName: attempt.user.name,
      rollNo: attempt.user.rollNo,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      percentage: attempt.totalMarks > 0 ? (attempt.score / attempt.totalMarks) * 100 : 0,
      completedAt: attempt.endedAt,
      timeSpent: attempt.endedAt && attempt.startedAt 
        ? Math.round((attempt.endedAt.getTime() - attempt.startedAt.getTime()) / 1000 / 60) // minutes
        : null
    }));

    const liveStats = {
      exam: {
        id: exam.id,
        title: exam.title,
        subject: exam.subject.name,
        class: exam.class?.name || 'All Classes',
        startTime: exam.startTime,
        endTime: exam.endTime,
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        status: isActive ? 'active' : isUpcoming ? 'upcoming' : 'completed'
      },
      statistics: {
        totalAttempts,
        completedAttempts,
        inProgressAttempts,
        totalEnrolled,
        completionRate: Math.round(completionRate * 10) / 10,
        participationRate: Math.round(participationRate * 10) / 10,
        averageScore: Math.round(avgPercentage * 10) / 10,
        timeRemaining: isActive ? Math.max(0, exam.endTime.getTime() - now.getTime()) : 0
      },
      recentSubmissions: formattedSubmissions,
      lastUpdated: now.toISOString()
    };

    return NextResponse.json(liveStats);

  } catch (error) {
    console.error('Error fetching live exam stats:', error);
    return NextResponse.json({ error: 'Failed to fetch live stats' }, { status: 500 });
  }
}
