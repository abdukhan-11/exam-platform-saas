import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { ExamNotificationService } from '@/lib/exams/exam-notification-service';

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
    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.UPDATE_EXAM])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    
    // Find the exam and validate access
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            questionOptions: true
          }
        },
        subject: true,
        class: true
      }
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate exam readiness for publishing
    const validationErrors = [];

    // Check if exam has questions
    if (exam.questions.length === 0) {
      validationErrors.push('Exam must have at least one question');
    }

    // Check if exam has valid timing
    const now = new Date();
    if (exam.endTime <= now) {
      validationErrors.push('Exam end time must be in the future');
    }

    if (exam.endTime <= exam.startTime) {
      validationErrors.push('Exam end time must be after start time');
    }

    // Check if exam has valid marks configuration
    if (exam.totalMarks <= 0) {
      validationErrors.push('Exam must have positive total marks');
    }

    if (exam.passingMarks > exam.totalMarks) {
      validationErrors.push('Passing marks cannot exceed total marks');
    }

    // Check if all questions have valid configuration
    for (const question of exam.questions) {
      if (question.marks <= 0) {
        validationErrors.push(`Question "${question.text.substring(0, 50)}..." must have positive marks`);
      }

      if (question.type === 'MULTIPLE_CHOICE') {
        const options = question.questionOptions;
        if (options.length < 2) {
          validationErrors.push(`Multiple choice question "${question.text.substring(0, 50)}..." must have at least 2 options`);
        }
        
        const correctOptions = options.filter(opt => opt.isCorrect);
        if (correctOptions.length === 0) {
          validationErrors.push(`Multiple choice question "${question.text.substring(0, 50)}..." must have at least one correct option`);
        }
      }

      if (question.type === 'TRUE_FALSE' && !question.correctAnswer) {
        validationErrors.push(`True/False question "${question.text.substring(0, 50)}..." must have a correct answer`);
      }

      if (question.type === 'SHORT_ANSWER' && !question.correctAnswer) {
        validationErrors.push(`Short answer question "${question.text.substring(0, 50)}..." must have a correct answer`);
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: 'Exam validation failed',
        details: validationErrors
      }, { status: 400 });
    }

    // Check if exam is already published
    if (exam.isPublished) {
      return NextResponse.json({
        error: 'Exam is already published',
        examId: exam.id,
        status: 'published'
      }, { status: 409 });
    }

    // Publish the exam
    const publishedExam = await db.exam.update({
      where: { id },
      data: {
        isPublished: true,
        updatedAt: new Date()
      },
      include: {
        subject: true,
        class: true,
        questions: {
          include: {
            questionOptions: true
          }
        }
      }
    });

    // Log the publishing event
    await db.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'EXAM_PUBLISHED',
        details: {
          examId: exam.id,
          examTitle: exam.title,
          publishedAt: new Date().toISOString(),
          publishedBy: currentUser.id,
          questionCount: exam.questions.length,
          totalMarks: exam.totalMarks
        }
      }
    });

    // Send real-time notification (don't fail if notification fails)
    try {
      const notificationService = ExamNotificationService.getInstance();
      await notificationService.notifyExamPublished(
        exam.id,
        exam.title,
        currentUser.id
      );
    } catch (notificationError) {
      console.warn('Failed to send exam publish notification:', notificationError);
      // Don't fail the publishing if notification fails
    }

    return NextResponse.json({
      message: 'Exam published successfully',
      exam: publishedExam,
      publishedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error publishing exam:', error);
    return NextResponse.json({ error: 'Failed to publish exam' }, { status: 500 });
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
    
    const currentUser = session.user as any;
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
        error: 'Cannot unpublish exam with active attempts',
        activeAttempts: exam.attempts.length
      }, { status: 409 });
    }

    // Unpublish the exam
    const unpublishedExam = await db.exam.update({
      where: { id },
      data: {
        isPublished: false,
        updatedAt: new Date()
      }
    });

    // Log the unpublishing event
    await db.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'EXAM_UNPUBLISHED',
        details: {
          examId: exam.id,
          examTitle: exam.title,
          unpublishedAt: new Date().toISOString(),
          unpublishedBy: currentUser.id
        }
      }
    });

    return NextResponse.json({
      message: 'Exam unpublished successfully',
      exam: unpublishedExam,
      unpublishedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error unpublishing exam:', error);
    return NextResponse.json({ error: 'Failed to unpublish exam' }, { status: 500 });
  }
}
