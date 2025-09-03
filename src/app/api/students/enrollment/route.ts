import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { z } from 'zod';

const enrollmentSchema = z.object({
  userId: z.string(),
  classId: z.string(),
  subjects: z.array(z.string()).optional(),
});

const bulkEnrollmentSchema = z.object({
  userIds: z.array(z.string()),
  classId: z.string(),
  subjects: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;

    if (!PermissionService.hasPermission(currentUser.role, Permission.CREATE_USER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const isBulk = Array.isArray(body.userIds);

    if (isBulk) {
      const parsed = bulkEnrollmentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
      }

      return await handleBulkEnrollment(parsed.data, currentUser);
    } else {
      const parsed = enrollmentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
      }

      return await handleSingleEnrollment(parsed.data, currentUser);
    }

  } catch (error) {
    console.error('Enrollment error:', error);
    return NextResponse.json({ error: 'Failed to process enrollment' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;

    if (!PermissionService.hasPermission(currentUser.role, Permission.READ_USER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const userId = searchParams.get('userId');

    if (classId) {
      return await getClassEnrollments(classId, currentUser);
    } else if (userId) {
      return await getStudentEnrollments(userId, currentUser);
    } else {
      return NextResponse.json({ error: 'classId or userId is required' }, { status: 400 });
    }

  } catch (error) {
    console.error('Get enrollment error:', error);
    return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;

    if (!PermissionService.hasPermission(currentUser.role, Permission.DELETE_USER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const classId = searchParams.get('classId');

    if (!userId || !classId) {
      return NextResponse.json({ error: 'userId and classId are required' }, { status: 400 });
    }

    return await handleUnenrollment(userId, classId, currentUser);

  } catch (error) {
    console.error('Unenrollment error:', error);
    return NextResponse.json({ error: 'Failed to process unenrollment' }, { status: 500 });
  }
}

async function handleSingleEnrollment(data: z.infer<typeof enrollmentSchema>, currentUser: any) {
  const { userId, classId, subjects } = data;

  // Verify student exists and user has permission
  const student = await db.user.findUnique({
    where: { id: userId },
    include: { college: true },
  });

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  if (currentUser.role === 'COLLEGE_ADMIN' && student.collegeId !== currentUser.collegeId) {
    return NextResponse.json({ error: 'Cannot enroll students from other colleges' }, { status: 403 });
  }

  // Verify class exists
  const classExists = await db.class.findUnique({
    where: { id: classId },
  });

  if (!classExists) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  // Check if already enrolled
  const existingEnrollment = await db.enrollment.findFirst({
    where: {
      userId,
      classId,
    },
  });

  if (existingEnrollment) {
    return NextResponse.json({ error: 'Student is already enrolled in this class' }, { status: 400 });
  }

  // Create enrollment
  const enrollment = await db.enrollment.create({
    data: {
      userId,
      classId,
      enrollmentDate: new Date(),
      status: 'ACTIVE',
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, rollNo: true },
      },
      class: {
        select: { id: true, name: true, description: true },
      },
    },
  });

  return NextResponse.json({
    message: 'Student enrolled successfully',
    enrollment,
  });
}

async function handleBulkEnrollment(data: z.infer<typeof bulkEnrollmentSchema>, currentUser: any) {
  const { userIds, classId, subjects } = data;

  // Verify all students exist and user has permission
  const students = await db.user.findMany({
    where: { id: { in: userIds } },
    include: { college: true },
  });

  if (students.length !== userIds.length) {
    return NextResponse.json({ error: 'Some students not found' }, { status: 404 });
  }

  for (const student of students) {
    if (currentUser.role === 'COLLEGE_ADMIN' && student.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Cannot enroll students from other colleges' }, { status: 403 });
    }
  }

  // Verify class exists
  const classExists = await db.class.findUnique({
    where: { id: classId },
  });

  if (!classExists) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  // Check existing enrollments
  const existingEnrollments = await db.enrollment.findMany({
    where: {
      userId: { in: userIds },
      classId,
    },
  });

  const alreadyEnrolledIds = existingEnrollments.map((e: any) => e.userId);
  const newEnrollmentIds = userIds.filter(id => !alreadyEnrolledIds.includes(id));

  if (newEnrollmentIds.length === 0) {
    return NextResponse.json({ error: 'All students are already enrolled in this class' }, { status: 400 });
  }

  // Create bulk enrollments
  const enrollments = await Promise.all(
    newEnrollmentIds.map(userId =>
      db.enrollment.create({
        data: {
          userId,
          classId,
          enrollmentDate: new Date(),
          status: 'ACTIVE',
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, rollNo: true },
          },
          class: {
            select: { id: true, name: true, description: true },
          },
        },
      })
    )
  );

  return NextResponse.json({
    message: `Enrolled ${enrollments.length} students successfully`,
    enrollments,
    alreadyEnrolled: alreadyEnrolledIds.length,
  });
}

async function getClassEnrollments(classId: string, currentUser: any) {
  // Verify class exists and user has permission
  const classInfo = await db.class.findUnique({
    where: { id: classId },
    include: { college: true },
  });

  if (!classInfo) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  if (currentUser.role === 'COLLEGE_ADMIN' && classInfo.collegeId !== currentUser.collegeId) {
    return NextResponse.json({ error: 'Cannot access class from other colleges' }, { status: 403 });
  }

  const enrollments = await db.enrollment.findMany({
    where: { classId },
    include: {
      user: {
        select: { id: true, name: true, email: true, rollNo: true, isActive: true },
      },
    },
    orderBy: { enrollmentDate: 'desc' },
  });

  return NextResponse.json({
    class: classInfo,
    enrollments,
    total: enrollments.length,
  });
}

async function getStudentEnrollments(userId: string, currentUser: any) {
  // Verify student exists and user has permission
  const student = await db.user.findUnique({
    where: { id: userId },
    include: { college: true },
  });

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  if (currentUser.role === 'COLLEGE_ADMIN' && student.collegeId !== currentUser.collegeId) {
    return NextResponse.json({ error: 'Cannot access student from other colleges' }, { status: 403 });
  }

  const enrollments = await db.enrollment.findMany({
    where: { userId },
    include: {
      class: {
        select: { id: true, name: true, description: true },
      },
    },
    orderBy: { enrollmentDate: 'desc' },
  });

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      rollNo: student.rollNo,
    },
    enrollments,
    total: enrollments.length,
  });
}

async function handleUnenrollment(userId: string, classId: string, currentUser: any) {
  // Verify student exists and user has permission
  const student = await db.user.findUnique({
    where: { id: userId },
    include: { college: true },
  });

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  if (currentUser.role === 'COLLEGE_ADMIN' && student.collegeId !== currentUser.collegeId) {
    return NextResponse.json({ error: 'Cannot unenroll students from other colleges' }, { status: 403 });
  }

  // Find and delete enrollment
  const enrollment = await db.enrollment.findFirst({
    where: {
      userId,
      classId,
    },
  });

  if (!enrollment) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
  }

  await db.enrollment.delete({
    where: { id: enrollment.id },
  });

  return NextResponse.json({
    message: 'Student unenrolled successfully',
  });
}
