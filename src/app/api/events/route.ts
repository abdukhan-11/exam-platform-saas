import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { z } from 'zod';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(['EXAM', 'ASSIGNMENT', 'ANNOUNCEMENT', 'OTHER']),
  scheduledAt: z.string().datetime(),
  endDateTime: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.string().optional(),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  // Only SUPER_ADMIN can specify explicit collegeId
  collegeId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;
    const url = new URL(req.url);
    const queryCollegeId = url.searchParams.get('collegeId') || undefined;
    const classId = url.searchParams.get('classId') || undefined;
    const subjectId = url.searchParams.get('subjectId') || undefined;

    if (!PermissionService.hasPermission(currentUser.role, Permission.READ_CLASS) &&
        !PermissionService.hasPermission(currentUser.role, Permission.READ_SUBJECT)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: any = {};
    if (currentUser.role === 'SUPER_ADMIN') {
      if (queryCollegeId) where.collegeId = queryCollegeId;
    } else {
      where.collegeId = currentUser.collegeId;
    }
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    const events = await db.event.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
    });

    return NextResponse.json({ items: events });
  } catch (error) {
    console.error('Error listing events:', error);
    return NextResponse.json({ error: 'Failed to list events' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;

    // Admins create events for the college; allow teachers to create class/subject events
    const canCreate = PermissionService.hasPermission(currentUser.role, Permission.CREATE_CLASS) ||
                      PermissionService.hasPermission(currentUser.role, Permission.CREATE_EXAM);
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createEventSchema.parse(body);

    const collegeId = currentUser.role === 'SUPER_ADMIN' ? parsed.collegeId : (currentUser.collegeId as string | undefined);
    if (!collegeId) {
      return NextResponse.json({ error: 'Missing collegeId' }, { status: 400 });
    }

    // Validate foreign keys belong to the college
    if (parsed.classId) {
      const cls = await db.class.findUnique({ where: { id: parsed.classId } });
      if (!cls || cls.collegeId !== collegeId) {
        return NextResponse.json({ error: 'Invalid classId for college' }, { status: 400 });
      }
    }
    if (parsed.subjectId) {
      const subj = await db.subject.findUnique({ where: { id: parsed.subjectId } });
      if (!subj || subj.collegeId !== collegeId) {
        return NextResponse.json({ error: 'Invalid subjectId for college' }, { status: 400 });
      }
    }

    const created = await db.event.create({
      data: {
        title: parsed.title,
        description: parsed.description,
        type: parsed.type as any,
        scheduledAt: new Date(parsed.scheduledAt),
        endDateTime: parsed.endDateTime ? new Date(parsed.endDateTime) : undefined,
        priority: parsed.priority as any,
        isRecurring: parsed.isRecurring ?? false,
        recurrencePattern: parsed.recurrencePattern,
        classId: parsed.classId,
        subjectId: parsed.subjectId,
        collegeId,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}


