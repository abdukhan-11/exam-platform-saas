import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const currentUser = session.user as any;
    if (currentUser.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'all'; // all, upcoming, results, reminders

    const now = new Date();
    const notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      priority: 'high' | 'medium' | 'low';
      createdAt: string;
      examId?: string;
      examTitle?: string;
      subject?: string;
      startTime?: Date;
      duration?: number;
      score?: number;
      totalMarks?: number;
      percentage?: number;
      grade?: string;
      passed?: boolean;
      completedAt?: Date;
    }> = [];

    // Get student's enrolled classes
    const enrollments = await db.enrollment.findMany({
      where: { 
        userId: currentUser.id, 
        status: 'ACTIVE' 
      },
      include: { class: true }
    });

    const classIds = enrollments.map(e => e.classId);

    if (classIds.length === 0) {
      return NextResponse.json({ notifications: [] });
    }

    // Get upcoming exams (next 7 days)
    if (type === 'all' || type === 'upcoming') {
      const upcomingExams = await db.exam.findMany({
        where: {
          classId: { in: classIds },
          collegeId: currentUser.collegeId,
          isActive: true,
          isPublished: true,
          startTime: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
          }
        },
        include: {
          subject: true,
          class: true
        },
        orderBy: { startTime: 'asc' }
      });

      upcomingExams.forEach(exam => {
        const hoursUntilStart = Math.round((exam.startTime.getTime() - now.getTime()) / (1000 * 60 * 60));
        
        notifications.push({
          id: `upcoming-${exam.id}`,
          type: 'upcoming_exam',
          title: 'Upcoming Exam',
          message: `${exam.title} (${exam.subject.name}) starts in ${hoursUntilStart} hours`,
          examId: exam.id,
          examTitle: exam.title,
          subject: exam.subject.name,
          startTime: exam.startTime,
          duration: exam.duration,
          priority: hoursUntilStart <= 24 ? 'high' : hoursUntilStart <= 72 ? 'medium' : 'low',
          createdAt: now.toISOString()
        });
      });
    }

    // Get recent results (last 7 days)
    if (type === 'all' || type === 'results') {
      const recentResults = await db.examResult.findMany({
        where: {
          userId: currentUser.id,
          isCompleted: true,
          endTime: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          exam: {
            include: {
              subject: true
            }
          }
        },
        orderBy: { endTime: 'desc' },
        take: 5
      });

      recentResults.forEach(result => {
        const percentage = result.totalMarks > 0 ? (result.score / result.totalMarks) * 100 : 0;
        const passed = result.score >= result.exam.passingMarks;
        
        notifications.push({
          id: `result-${result.id}`,
          type: 'exam_result',
          title: 'Exam Result Available',
          message: `${result.exam.title}: ${result.score}/${result.totalMarks} (${percentage.toFixed(1)}%) - ${passed ? 'Passed' : 'Failed'}`,
          examId: result.examId,
          examTitle: result.exam.title,
          subject: result.exam.subject.name,
          score: result.score,
          totalMarks: result.totalMarks,
          percentage: Math.round(percentage * 10) / 10,
          grade: result.grade ?? undefined,
          passed,
          completedAt: result.endTime ?? undefined,
          priority: 'medium',
          createdAt: result.endTime?.toISOString() || now.toISOString()
        });
      });
    }

    // Get exam reminders (exams starting in next 24 hours)
    if (type === 'all' || type === 'reminders') {
      const reminderExams = await db.exam.findMany({
        where: {
          classId: { in: classIds },
          collegeId: currentUser.collegeId,
          isActive: true,
          isPublished: true,
          startTime: {
            gte: now,
            lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Next 24 hours
          }
        },
        include: {
          subject: true,
          class: true
        },
        orderBy: { startTime: 'asc' }
      });

      reminderExams.forEach(exam => {
        const hoursUntilStart = Math.round((exam.startTime.getTime() - now.getTime()) / (1000 * 60 * 60));
        
        notifications.push({
          id: `reminder-${exam.id}`,
          type: 'exam_reminder',
          title: 'Exam Reminder',
          message: `Don't forget: ${exam.title} starts in ${hoursUntilStart} hours`,
          examId: exam.id,
          examTitle: exam.title,
          subject: exam.subject.name,
          startTime: exam.startTime,
          duration: exam.duration,
          priority: 'high',
          createdAt: now.toISOString()
        });
      });
    }

    // Sort notifications by priority and creation time
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    notifications.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ 
      notifications,
      totalCount: notifications.length,
      lastUpdated: now.toISOString()
    });

  } catch (error) {
    console.error('Error fetching exam notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
