import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const currentUser = session.user as any;
    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.UPDATE_EXAM, Permission.READ_ANALYTICS])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    
    // Find the exam and validate access
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        subject: true,
        class: true,
        examResults: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                rollNo: true
              }
            }
          },
          orderBy: [
            { percentage: 'desc' },
            { score: 'desc' }
          ]
        }
      }
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if exam is completed
    if (!exam.examResults.length) {
      return NextResponse.json({ 
        error: 'No results available to share. Students must complete the exam first.' 
      }, { status: 400 });
    }

    // Get all students who took the exam
    const studentIds = exam.examResults.map(result => result.user.id);

    // Create notifications for all students who took the exam
    const notifications = studentIds.map(studentId => ({
      userId: studentId,
      title: `🏆 Award List Available: ${exam.title}`,
      message: `The award list for "${exam.title}" (${exam.subject.name}) has been shared. Check your rankings in the Awards section!`,
      type: 'SUCCESS' as const,
      channel: 'IN_APP' as const,
      collegeId: exam.collegeId,
      eventId: null,
    }));

    // Batch create notifications
    await db.notification.createMany({
      data: notifications
    });

    // Log the sharing action
    await db.examActivityLog.create({
      data: {
        examId: exam.id,
        userId: currentUser.id,
        action: 'SHARE_AWARDS',
        details: {
          examTitle: exam.title,
          subject: exam.subject.name,
          studentsNotified: studentIds.length,
          sharedAt: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Award list shared successfully',
      studentsNotified: studentIds.length,
      examTitle: exam.title
    });

  } catch (error) {
    console.error('Error sharing award list:', error);
    return NextResponse.json({ 
      error: 'Failed to share award list' 
    }, { status: 500 });
  }
}
