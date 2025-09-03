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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;
    if (currentUser.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Get exam details
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        subject: true,
        college: true,
        class: true
      }
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Check if exam is active and published
    if (!exam.isActive || !exam.isPublished) {
      return NextResponse.json({ error: 'Exam is not available' }, { status: 400 });
    }

    // Check if exam is within time window
    const now = new Date();
    if (now < exam.startTime) {
      return NextResponse.json({ error: 'Exam has not started yet' }, { status: 400 });
    }

    if (now > exam.endTime) {
      return NextResponse.json({ error: 'Exam has ended' }, { status: 400 });
    }

    // Check if student is enrolled in the class
    if (exam.classId) {
      const enrollment = await db.enrollment.findFirst({
        where: {
          userId: currentUser.id,
          classId: exam.classId,
          status: 'ACTIVE'
        }
      });

      if (!enrollment) {
        return NextResponse.json({ error: 'You are not enrolled in this class' }, { status: 403 });
      }
    }

    // Check if student has already attempted this exam
    const existingAttempt = await db.studentExamAttempt.findUnique({
      where: {
        userId_examId: {
          userId: currentUser.id,
          examId: id
        }
      }
    });

    if (existingAttempt) {
      if (existingAttempt.isCompleted) {
        return NextResponse.json({ error: 'You have already completed this exam' }, { status: 400 });
      }
      
      // Return existing attempt if not completed
      return NextResponse.json({
        id: existingAttempt.id,
        startedAt: existingAttempt.startedAt,
        isCompleted: existingAttempt.isCompleted
      });
    }

    // Check max attempts
    const attemptCount = await db.studentExamAttempt.count({
      where: {
        userId: currentUser.id,
        examId: id
      }
    });

    if (attemptCount >= exam.maxAttempts) {
      return NextResponse.json({ error: 'Maximum attempts exceeded' }, { status: 400 });
    }

    // Create new exam attempt
    const attempt = await db.studentExamAttempt.create({
      data: {
        userId: currentUser.id,
        examId: id,
        collegeId: exam.collegeId,
        startedAt: new Date(),
        isCompleted: false,
        score: 0,
        totalMarks: 0
      }
    });

    return NextResponse.json({
      id: attempt.id,
      startedAt: attempt.startedAt,
      isCompleted: attempt.isCompleted
    });

  } catch (error: any) {
    console.error('Error starting exam:', error);
    return NextResponse.json({ error: 'Failed to start exam' }, { status: 500 });
  }
}
