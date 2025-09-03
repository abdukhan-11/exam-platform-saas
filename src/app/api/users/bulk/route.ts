import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const bulkOperationSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'delete', 'password-reset', 'role-change']),
  userIds: z.array(z.string()),
  data: z.object({
    role: z.string().optional(),
    newPassword: z.string().optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;

    // Check permissions based on user role
    if (currentUser.role === 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = bulkOperationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { action, userIds, data } = parsed.data;

    // Validate that all user IDs exist and user has permission to modify them
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      include: { college: true },
    });

    if (users.length !== userIds.length) {
      return NextResponse.json({ error: 'Some users not found' }, { status: 404 });
    }

    // Check permissions for each user
    for (const user of users) {
      if (currentUser.role === 'COLLEGE_ADMIN' && user.collegeId !== currentUser.collegeId) {
        return NextResponse.json({ error: 'Cannot modify users from other colleges' }, { status: 403 });
      }
    }

    let result;

    switch (action) {
      case 'activate':
        result = await handleBulkActivate(userIds);
        break;
      case 'deactivate':
        result = await handleBulkDeactivate(userIds);
        break;
      case 'delete':
        result = await handleBulkDelete(userIds);
        break;
      case 'password-reset':
        result = await handleBulkPasswordReset(userIds, data?.newPassword);
        break;
      case 'role-change':
        if (!data?.role) {
          return NextResponse.json({ error: 'Role is required for role change' }, { status: 400 });
        }
        result = await handleBulkRoleChange(userIds, data.role);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Bulk user operation error:', error);
    return NextResponse.json({ error: 'Failed to perform bulk operation' }, { status: 500 });
  }
}

async function handleBulkActivate(userIds: string[]) {
  const updatedUsers = await db.user.updateMany({
    where: { id: { in: userIds } },
    data: { isActive: true },
  });

  return {
    message: `Activated ${updatedUsers.count} users`,
    count: updatedUsers.count,
  };
}

async function handleBulkDeactivate(userIds: string[]) {
  const updatedUsers = await db.user.updateMany({
    where: { id: { in: userIds } },
    data: { isActive: false },
  });

  return {
    message: `Deactivated ${updatedUsers.count} users`,
    count: updatedUsers.count,
  };
}

async function handleBulkDelete(userIds: string[]) {
  // First delete related records
  await db.studentExamAttempt.deleteMany({
    where: { userId: { in: userIds } },
  });

  // Get all attempt IDs for the users
  const attempts = await db.studentExamAttempt.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  
  const attemptIds = attempts.map(attempt => attempt.id);
  
  await db.studentAnswer.deleteMany({
    where: { attemptId: { in: attemptIds } },
  });

  await db.examResult.deleteMany({
    where: { userId: { in: userIds } },
  });

  // Then delete users
  const deletedUsers = await db.user.deleteMany({
    where: { id: { in: userIds } },
  });

  return {
    message: `Deleted ${deletedUsers.count} users`,
    count: deletedUsers.count,
  };
}

async function handleBulkPasswordReset(userIds: string[], newPassword?: string) {
  const password = newPassword || 'ChangeMe123!';
  const hashedPassword = await bcrypt.hash(password, 12);

  const updatedUsers = await db.user.updateMany({
    where: { id: { in: userIds } },
    data: { password: hashedPassword },
  });

  return {
    message: `Reset passwords for ${updatedUsers.count} users`,
    count: updatedUsers.count,
    defaultPassword: password,
  };
}

async function handleBulkRoleChange(userIds: string[], newRole: string) {
  // Validate role
  const validRoles = ['STUDENT', 'COLLEGE_ADMIN', 'SUPER_ADMIN'];
  if (!validRoles.includes(newRole)) {
    throw new Error(`Invalid role: ${newRole}`);
  }

  const updatedUsers = await db.user.updateMany({
    where: { id: { in: userIds } },
    data: { role: newRole as any },
  });

  return {
    message: `Changed role to ${newRole} for ${updatedUsers.count} users`,
    count: updatedUsers.count,
  };
}
