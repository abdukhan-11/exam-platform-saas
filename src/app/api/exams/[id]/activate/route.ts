import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { ExamNotificationService } from '@/lib/exams/exam-notification-service';

interface AuthenticatedUser {
  id: string;
  role: string;
  collegeId: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const currentUser = session.user as AuthenticatedUser;
    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.UPDATE_EXAM])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    
    // Find the exam and validate access
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        subject: true,
        class: true,
        attempts: {
          where: {
            isCompleted: false
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

    // Check if exam is published
    if (!exam.isPublished) {
      return NextResponse.json({
        error: 'Exam must be published before activation',
        examId: exam.id,
        status: 'draft'
      }, { status: 400 });
    }

    // Check if exam is already active
    if (exam.isActive) {
      return NextResponse.json({
        error: 'Exam is already active',
        examId: exam.id,
        status: 'active'
      }, { status: 409 });
    }

    // Check if exam timing is valid for activation
    const now = new Date();
    
    if (exam.startTime > now) {
      return NextResponse.json({
        error: 'Exam cannot be activated before start time',
        examId: exam.id,
        startTime: exam.startTime,
        currentTime: now
      }, { status: 400 });
    }

    if (exam.endTime <= now) {
      return NextResponse.json({
        error: 'Exam end time has passed',
        examId: exam.id,
        endTime: exam.endTime,
        currentTime: now
      }, { status: 400 });
    }

    // Activate the exam
    const activatedExam = await db.exam.update({
      where: { id },
      data: {
        isActive: true,
        updatedAt: new Date()
      },
      include: {
        subject: true,
        class: true
      }
    });

    // Log the activation event
    await db.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'EXAM_ACTIVATED',
        details: {
          examId: exam.id,
          examTitle: exam.title,
          activatedAt: new Date().toISOString(),
          activatedBy: currentUser.id,
          startTime: exam.startTime.toISOString(),
          endTime: exam.endTime.toISOString()
        }
      }
    });

    // Send real-time notification (don't fail if notification fails)
    try {
      const notificationService = ExamNotificationService.getInstance();
      await notificationService.notifyExamActivated(
        exam.id,
        exam.title,
        currentUser.id
      );
    } catch (notificationError) {
      console.warn('Failed to send exam activation notification:', notificationError);
      // Don't fail the activation if notification fails
    }

    return NextResponse.json({
      message: 'Exam activated successfully',
      exam: activatedExam,
      activatedAt: new Date().toISOString(),
      activeAttempts: exam.attempts.length
    });

  } catch (error) {
    console.error('Error activating exam:', error);
    return NextResponse.json({ error: 'Failed to activate exam' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const currentUser = session.user as AuthenticatedUser;
    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.UPDATE_EXAM])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        attempts: {
          where: {
            isCompleted: false
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

    // Check if exam has active attempts
    if (exam.attempts.length > 0) {
      return NextResponse.json({
        error: 'Cannot deactivate exam with active attempts',
        activeAttempts: exam.attempts.length
      }, { status: 409 });
    }

    // Deactivate the exam
    const deactivatedExam = await db.exam.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    // Log the deactivation event
    await db.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'EXAM_DEACTIVATED',
        details: {
          examId: exam.id,
          examTitle: exam.title,
          deactivatedAt: new Date().toISOString(),
          deactivatedBy: currentUser.id
        }
      }
    });

    return NextResponse.json({
      message: 'Exam deactivated successfully',
      exam: deactivatedExam,
      deactivatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deactivating exam:', error);
    return NextResponse.json({ error: 'Failed to deactivate exam' }, { status: 500 });
  }
}
