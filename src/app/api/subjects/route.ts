import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { z } from 'zod';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

const createSubjectSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  credits: z.number().int().min(1).max(10).optional(),
  classId: z.string().optional(),
  // Only Super Admin can specify collegeId explicitly
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

    // Determine scope
    let collegeId: string | undefined = currentUser.collegeId as string | undefined;
    if (!collegeId && queryCollegeId) {
      collegeId = queryCollegeId;
    }

    // College Admins (acting as teachers) can read subjects they are assigned to
    const canReadSubject = PermissionService.hasPermission(currentUser.role, Permission.READ_SUBJECT);
    if (!canReadSubject) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (currentUser.role === 'COLLEGE_ADMIN') {
      const assignments = await db.teacherClassAssignment.findMany({
        where: { teacherId: currentUser.id, isActive: true },
        include: { subject: true, class: true },
      });

      const subjects = assignments
        .map(a => a.subject)
        // De-duplicate by id
        .filter((s, idx, arr) => arr.findIndex(x => x.id === s.id) === idx);

      return NextResponse.json({ items: subjects });
    }

    // College Admins and Super Admins can list subjects
    if (currentUser.role === 'COLLEGE_ADMIN' || currentUser.role === 'SUPER_ADMIN') {
      const where: { collegeId?: string } = {};
      if (currentUser.role === 'COLLEGE_ADMIN') {
        where.collegeId = currentUser.collegeId;
      } else if (queryCollegeId) {
        where.collegeId = queryCollegeId;
      }

      const subjects = await db.subject.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ items: subjects });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('Error listing subjects:', error);
    return NextResponse.json({ error: 'Failed to list subjects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;
    const canCreate = PermissionService.hasPermission(currentUser.role, Permission.CREATE_SUBJECT);
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSubjectSchema.parse(body);

    // Resolve college scope
    const collegeId = currentUser.role === 'SUPER_ADMIN' ? parsed.collegeId : (currentUser.collegeId as string | undefined);
    if (!collegeId) {
      return NextResponse.json({ error: 'Missing collegeId' }, { status: 400 });
    }

    // Validate class belongs to same college if provided
    if (parsed.classId) {
      const cls = await db.class.findUnique({ where: { id: parsed.classId } });
      if (!cls || cls.collegeId !== collegeId) {
        return NextResponse.json({ error: 'Invalid classId for college' }, { status: 400 });
      }
    }

    const created = await db.subject.create({
      data: {
        name: parsed.name,
        code: parsed.code,
        description: parsed.description,
        credits: parsed.credits ?? 3,
        classId: parsed.classId,
        collegeId,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating subject:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    // Handle unique constraint (code per college)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Subject code already exists in this college' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 });
  }
}


