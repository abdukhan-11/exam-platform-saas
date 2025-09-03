import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { z } from 'zod';

const createClassSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  description: z.string().optional(),
  academicYear: z.string().min(1, 'Academic year is required'),
  collegeId: z.string().min(1, 'College is required'),
});

// GET /api/classes - List all classes for a college (or all for superadmin)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const collegeIdParam = searchParams.get('collegeId');

    let whereClause: any = {};

    if (session.user.role === 'SUPER_ADMIN') {
      if (collegeIdParam) {
        whereClause.collegeId = collegeIdParam;
      }
    } else if (session.user.role === 'COLLEGE_ADMIN') {
      whereClause.collegeId = session.user.collegeId;
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const classes = await db.class.findMany({
      where: whereClause,
      include: {
        college: { select: { id: true, name: true } },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formattedClasses = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      description: cls.description,
      academicYear: cls.academicYear,
      college: cls.college?.name || 'N/A',
      studentCount: cls._count.enrollments,
    }));

    return NextResponse.json({ classes: formattedClasses }, { status: 200 });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}

// POST /api/classes - Create a new class
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'COLLEGE_ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createClassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { name, description, academicYear, collegeId } = parsed.data;

    // Ensure college admin can only create classes for their college
    if (session.user.role === 'COLLEGE_ADMIN' && session.user.collegeId !== collegeId) {
      return NextResponse.json({ error: 'Forbidden: Cannot create class for another college' }, { status: 403 });
    }

    const newClass = await db.class.create({
      data: {
        name,
        description,
        academicYear,
        collegeId,
      },
    });

    return NextResponse.json({ class: newClass, message: 'Class created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }
}