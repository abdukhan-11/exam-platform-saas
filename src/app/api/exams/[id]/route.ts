import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { z } from 'zod';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

const updateExamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  duration: z.number().int().min(1).max(1000).optional(),
  totalMarks: z.number().int().min(1).max(10000).optional(),
  passingMarks: z.number().int().min(0).max(10000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  classId: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
  enableQuestionShuffling: z.boolean().optional(),
  enableTimeLimitPerQuestion: z.boolean().optional(),
  timeLimitPerQuestion: z.number().int().min(5).max(3600).nullable().optional(),
  enableBrowserLock: z.boolean().optional(),
  enableFullscreenMode: z.boolean().optional(),
  enableWebcamMonitoring: z.boolean().optional(),
  enableScreenRecording: z.boolean().optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  allowRetakes: z.boolean().optional(),
  retakeDelayHours: z.number().int().min(0).max(240).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;

    const { id } = await params;
    const exam = await db.exam.findUnique({ where: { id } });
    if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.READ_EXAM])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(exam);
  } catch (error) {
    console.error('Error fetching exam:', error);
    return NextResponse.json({ error: 'Failed to fetch exam' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session in exam update:', session);
    
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;
    console.log('Current user in exam update:', currentUser);
    
    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.UPDATE_EXAM])) {
      console.log('Permission check failed for role:', currentUser.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.exam.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (currentUser.role !== 'SUPER_ADMIN' && existing.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateExamSchema.parse(body);

    // Validate timing
    if (parsed.startTime && parsed.endTime) {
      const start = new Date(parsed.startTime);
      const end = new Date(parsed.endTime);
      if (end <= start) {
        return NextResponse.json({ error: 'endTime must be after startTime' }, { status: 400 });
      }
    }

    if (parsed.classId) {
      const cls = await db.class.findUnique({ where: { id: parsed.classId } });
      if (!cls || cls.collegeId !== existing.collegeId) {
        return NextResponse.json({ error: 'Invalid classId for college' }, { status: 400 });
      }
    }

    const updated = await db.exam.update({
      where: { id },
      data: {
        ...parsed,
        startTime: parsed.startTime ? new Date(parsed.startTime) : undefined,
        endTime: parsed.endTime ? new Date(parsed.endTime) : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating exam:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update exam' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;
    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.DELETE_EXAM])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.exam.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (currentUser.role !== 'SUPER_ADMIN' && existing.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = await db.exam.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json(deleted);
  } catch (error) {
    console.error('Error deleting exam:', error);
    return NextResponse.json({ error: 'Failed to delete exam' }, { status: 500 });
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Duplicate endpoint: POST /api/exams/[id]
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;

    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.CREATE_EXAM])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.exam.findUnique({ where: { id }, include: { questions: true } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (currentUser.role !== 'SUPER_ADMIN' && existing.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const duplicated = await db.$transaction(async (tx) => {
      const newExam = await tx.exam.create({
        data: {
          title: `${existing.title} (Copy)`,
          description: existing.description,
          duration: existing.duration,
          totalMarks: existing.totalMarks,
          passingMarks: existing.passingMarks,
          startTime: existing.startTime,
          endTime: existing.endTime,
          isActive: true,
          isPublished: false,
          subjectId: existing.subjectId,
          collegeId: existing.collegeId,
          classId: existing.classId,
          createdById: currentUser.id,
          enableQuestionShuffling: existing.enableQuestionShuffling,
          enableTimeLimitPerQuestion: existing.enableTimeLimitPerQuestion,
          timeLimitPerQuestion: existing.timeLimitPerQuestion,
          enableBrowserLock: existing.enableBrowserLock,
          enableFullscreenMode: existing.enableFullscreenMode,
          enableWebcamMonitoring: existing.enableWebcamMonitoring,
          enableScreenRecording: existing.enableScreenRecording,
          maxAttempts: existing.maxAttempts,
          allowRetakes: existing.allowRetakes,
          retakeDelayHours: existing.retakeDelayHours,
        },
      });

      if (existing.questions.length > 0) {
        for (const q of existing.questions) {
          await tx.question.create({
            data: {
              text: q.text,
              type: q.type,
              options: q.options || undefined,
              correctAnswer: q.correctAnswer,
              marks: q.marks,
              difficulty: q.difficulty,
              explanation: q.explanation ?? undefined,
              examId: newExam.id,
            },
          });
        }
      }

      return newExam;
    });

    return NextResponse.json(duplicated, { status: 201 });
  } catch (error) {
    console.error('Error duplicating exam:', error);
    return NextResponse.json({ error: 'Failed to duplicate exam' }, { status: 500 });
  }
}


