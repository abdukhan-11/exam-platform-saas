import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { z } from 'zod';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

const updateSubjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  credits: z.number().int().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
  classId: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;

    const subject = await db.subject.findUnique({ where: { id: params.id } });
    if (!subject) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!PermissionService.hasPermission(currentUser.role, Permission.READ_SUBJECT)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (currentUser.role === 'TEACHER') {
      const hasAssignment = await db.teacherClassAssignment.findFirst({
        where: { teacherId: currentUser.id, subjectId: subject.id, isActive: true },
      });
      if (!hasAssignment) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (currentUser.role === 'COLLEGE_ADMIN') {
      if (subject.collegeId !== currentUser.collegeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(subject);
  } catch (error) {
    console.error('Error fetching subject:', error);
    return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;

    if (!PermissionService.hasPermission(currentUser.role, Permission.UPDATE_SUBJECT)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subject = await db.subject.findUnique({ where: { id: params.id } });
    if (!subject) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (currentUser.role === 'COLLEGE_ADMIN' && subject.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (currentUser.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSubjectSchema.parse(body);

    // Validate class belongs to same college if provided
    if (parsed.classId) {
      const cls = await db.class.findUnique({ where: { id: parsed.classId } });
      if (!cls || cls.collegeId !== subject.collegeId) {
        return NextResponse.json({ error: 'Invalid classId for college' }, { status: 400 });
      }
    }

    const updated = await db.subject.update({
      where: { id: params.id },
      data: parsed,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating subject:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Subject code already exists in this college' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;
    if (!PermissionService.hasPermission(currentUser.role, Permission.DELETE_SUBJECT)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subject = await db.subject.findUnique({ where: { id: params.id } });
    if (!subject) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (currentUser.role === 'COLLEGE_ADMIN' && subject.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (currentUser.role === 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Consider soft-delete by setting isActive=false instead of hard delete
    const deleted = await db.subject.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return NextResponse.json(deleted);
  } catch (error) {
    console.error('Error deleting subject:', error);
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 });
  }
}


