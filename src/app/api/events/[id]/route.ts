import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { z } from 'zod';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum(['EXAM', 'ASSIGNMENT', 'ANNOUNCEMENT', 'OTHER']).optional(),
  scheduledAt: z.string().datetime().optional(),
  endDateTime: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.string().nullable().optional(),
  classId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUser = session.user as any;

    const { id } = await params;
    const event = await db.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (currentUser.role !== 'SUPER_ADMIN' && event.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.READ_CLASS, Permission.READ_SUBJECT])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUser = session.user as any;

    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.UPDATE_CLASS, Permission.UPDATE_EXAM])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.event.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (currentUser.role !== 'SUPER_ADMIN' && existing.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateEventSchema.parse(body);

    // Validate FK ownership if changing
    if (parsed.classId) {
      const cls = await db.class.findUnique({ where: { id: parsed.classId } });
      if (!cls || cls.collegeId !== existing.collegeId) {
        return NextResponse.json({ error: 'Invalid classId for college' }, { status: 400 });
      }
    }
    if (parsed.subjectId) {
      const subj = await db.subject.findUnique({ where: { id: parsed.subjectId } });
      if (!subj || subj.collegeId !== existing.collegeId) {
        return NextResponse.json({ error: 'Invalid subjectId for college' }, { status: 400 });
      }
    }

    const updated = await db.event.update({
      where: { id },
      data: {
        ...parsed,
        scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : undefined,
        endDateTime: parsed.endDateTime ? new Date(parsed.endDateTime) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating event:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUser = session.user as any;

    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.DELETE_CLASS, Permission.DELETE_EXAM])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.event.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (currentUser.role !== 'SUPER_ADMIN' && existing.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = await db.event.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json(deleted);
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}


