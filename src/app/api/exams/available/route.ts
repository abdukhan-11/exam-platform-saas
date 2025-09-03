import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { auditLogger } from '@/lib/security/audit-logger';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

interface AuthenticatedUser {
  id: string;
  role: string;
  collegeId: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as AuthenticatedUser;

    if (!PermissionService.hasPermission(currentUser.role, Permission.READ_EXAM)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const url = new URL(req.url);
    const classId = url.searchParams.get('classId') || undefined;
    const subjectId = url.searchParams.get('subjectId') || undefined;

    const where: {
      collegeId: string;
      isActive: boolean;
      isPublished: boolean;
      startTime: { lte: Date };
      endTime: { gte: Date };
      classId?: string | { in: string[] };
      subjectId?: string;
    } = {
      collegeId: currentUser.collegeId,
      isActive: true,
      isPublished: true,
      startTime: { lte: now },
      endTime: { gte: now },
    };
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    // Scope to student's enrolled classes when role is STUDENT
    if (currentUser.role === 'STUDENT') {
      const enrollments = await db.enrollment.findMany({
        where: { userId: currentUser.id, status: 'ACTIVE' },
        select: { classId: true },
      });
      const classIds = enrollments.map((e) => e.classId);
      if (classIds.length) {
        // If exam has a specific class, check if student is enrolled in that class
        // If exam is for "All Classes" (classId is null), show to all enrolled students
        if (where.classId && typeof where.classId === 'string') {
          // Exam is for a specific class - check if student is enrolled in that class
          if (!classIds.includes(where.classId)) {
            // Student is not enrolled in this specific class
            await auditLogger.logAuthorization('access_denied', {
              userId: currentUser.id,
              role: currentUser.role,
              collegeId: currentUser.collegeId,
              resource: 'exam',
              action: 'list_available',
              reason: 'not_enrolled_in_class',
            });
            return NextResponse.json({ items: [] });
          }
        }
        // For "All Classes" exams, no additional filtering needed - student can see it
      } else {
        // No active enrollments → return empty
        await auditLogger.logAuthorization('access_denied', {
          userId: currentUser.id,
          role: currentUser.role,
          collegeId: currentUser.collegeId,
          resource: 'exam',
          action: 'list_available',
          reason: 'no_active_enrollments',
        });
        return NextResponse.json({ items: [] });
      }
    }

    const exams = await db.exam.findMany({
      where,
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        subjectId: true,
        classId: true,
        totalMarks: true,
        duration: true,
      },
    });

    await auditLogger.logUserAction('list_available_exams', {
      userId: currentUser.id,
      collegeId: currentUser.collegeId,
      role: currentUser.role,
      resource: 'exam',
      action: 'list',
      metadata: {
        count: exams.length,
        classId: where.classId ?? null,
        subjectId: where.subjectId ?? null,
      },
    });

    return NextResponse.json({ items: exams });
  } catch (error) {
      console.error('Error listing available exams:', error);
      try {
        const session = await getServerSession(authOptions);
        const currentUser = session?.user as AuthenticatedUser | undefined;
        if (currentUser?.id) {
          await auditLogger.logSystem('error', {
            level: 'error',
            description: 'Failed to list available exams',
            metadata: { userId: currentUser.id },
          });
        }
      } catch {}
      return NextResponse.json({ error: 'Failed to list available exams' }, { status: 500 });
    }
}


