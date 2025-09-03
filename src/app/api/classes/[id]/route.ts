import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateClassSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  academicYear: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classId = params.id;

    const classData = await db.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, rollNo: true }
            }
          }
        },
        subjects: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Transform the data to include student count
    const classWithCounts = {
      ...classData,
      studentCount: classData.enrollments.filter((e: any) => e.status === 'ACTIVE').length
    };

    return NextResponse.json(classWithCounts);
  } catch (error) {
    console.error('Error fetching class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    // Check if user has permission to update classes
    if (session.user.role !== 'COLLEGE_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const classId = params.id;
    const body = await req.json();
    const parsed = updateClassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;

    // Update the class
    const updatedClass = await db.class.update({
      where: { id: classId },
      data: {
        ...data
      },
      include: {
        subjects: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to delete classes
    if (session.user.role !== 'COLLEGE_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const classId = params.id;

    // Check if class has active enrollments
    const activeEnrollments = await db.enrollment.count({
      where: {
        classId: classId,
        status: 'ACTIVE'
      }
    });

    if (activeEnrollments > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete class with active enrollments' 
      }, { status: 400 });
    }

    // Delete the class
    await db.class.delete({
      where: { id: classId }
    });

    return NextResponse.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}