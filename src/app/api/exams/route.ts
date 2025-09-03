import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { z } from 'zod';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

const createExamSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  duration: z.number().int().min(1).max(1000),
  totalMarks: z.number().int().min(1).max(10000),
  passingMarks: z.number().int().min(0).max(10000),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  subjectId: z.string(),
  classId: z.string().optional(),
  isActive: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  // Anti-cheating flags
  enableQuestionShuffling: z.boolean().optional(),
  enableTimeLimitPerQuestion: z.boolean().optional(),
  timeLimitPerQuestion: z.number().int().min(5).max(3600).optional(),
  enableBrowserLock: z.boolean().optional(),
  enableFullscreenMode: z.boolean().optional(),
  enableWebcamMonitoring: z.boolean().optional(),
  enableScreenRecording: z.boolean().optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  allowRetakes: z.boolean().optional(),
  retakeDelayHours: z.number().int().min(0).max(240).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;

    const url = new URL(req.url);
    const subjectId = url.searchParams.get('subjectId') || undefined;
    const classId = url.searchParams.get('classId') || undefined;
    const where: any = {};

    if (currentUser.role !== 'SUPER_ADMIN') {
      where.collegeId = currentUser.collegeId;
    } else {
      const collegeId = url.searchParams.get('collegeId') || undefined;
      if (collegeId) where.collegeId = collegeId;
    }
    if (subjectId) where.subjectId = subjectId;
    if (classId) where.classId = classId;

    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.READ_EXAM, Permission.CREATE_EXAM])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const exams = await db.exam.findMany({ where, orderBy: { startTime: 'desc' } });
    return NextResponse.json({ items: exams });
  } catch (error) {
    console.error('Error listing exams:', error);
    return NextResponse.json({ error: 'Failed to list exams' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session in exam creation:', session);
    
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;
    console.log('Current user in exam creation:', currentUser);

    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.CREATE_EXAM])) {
      console.log('Permission check failed for role:', currentUser.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createExamSchema.parse(body);

    // Resolve college scope via subject and class
    const subject = await db.subject.findUnique({ where: { id: parsed.subjectId } });
    if (!subject) return NextResponse.json({ error: 'Invalid subjectId' }, { status: 400 });
    if (currentUser.role !== 'SUPER_ADMIN' && subject.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (parsed.classId) {
      const cls = await db.class.findUnique({ where: { id: parsed.classId } });
      if (!cls || cls.collegeId !== subject.collegeId) {
        return NextResponse.json({ error: 'Invalid classId for subject college' }, { status: 400 });
      }
    }

    // Ensure timing validity
    const start = new Date(parsed.startTime);
    const end = new Date(parsed.endTime);
    if (end <= start) {
      return NextResponse.json({ error: 'endTime must be after startTime' }, { status: 400 });
    }

    const created = await db.exam.create({
      data: {
        title: parsed.title,
        description: parsed.description,
        duration: parsed.duration,
        totalMarks: parsed.totalMarks,
        passingMarks: parsed.passingMarks,
        startTime: start,
        endTime: end,
        subjectId: parsed.subjectId,
        collegeId: subject.collegeId,
        classId: parsed.classId || null,
        isActive: parsed.isActive ?? true,
        isPublished: parsed.isPublished ?? false,
        enableQuestionShuffling: parsed.enableQuestionShuffling ?? true,
        enableTimeLimitPerQuestion: parsed.enableTimeLimitPerQuestion ?? false,
        timeLimitPerQuestion: parsed.timeLimitPerQuestion,
        enableBrowserLock: parsed.enableBrowserLock ?? true,
        enableFullscreenMode: parsed.enableFullscreenMode ?? true,
        enableWebcamMonitoring: parsed.enableWebcamMonitoring ?? false,
        enableScreenRecording: parsed.enableScreenRecording ?? false,
        maxAttempts: parsed.maxAttempts ?? 1,
        allowRetakes: parsed.allowRetakes ?? false,
        retakeDelayHours: parsed.retakeDelayHours ?? 24,
        createdById: currentUser.id,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating exam:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create exam' }, { status: 500 });
  }
}


