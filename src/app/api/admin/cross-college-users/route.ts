import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { AppRole, isValidRole } from '@/types/auth';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { college: true }
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const collegeId = searchParams.get('collegeId');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause for cross-college user search
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { rollNo: { contains: search, mode: 'insensitive' } },
        { college: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (role && role !== 'all') {
      whereClause.role = role;
    }

    if (collegeId && collegeId !== 'all') {
      whereClause.collegeId = collegeId;
    }

    if (isActive && isActive !== 'all') {
      whereClause.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    // Get users with college information
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          college: {
            select: {
              id: true,
              name: true,
              subscriptionStatus: true,
              isActive: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where: whereClause })
    ]);

    // Get colleges for filtering
    const colleges = await prisma.college.findMany({
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });

    // Get user statistics
    const userStats = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      users,
      total,
      page,
      limit,
      totalPages,
      colleges,
      userStats: userStats.map(stat => ({
        role: stat.role,
        count: stat._count.id
      }))
    });

  } catch (error) {
    console.error('Cross-college users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, userIds, data } = body;

    switch (action) {
      case 'bulk-password-reset':
        return await handleBulkPasswordReset(userIds);
      
      case 'bulk-role-change':
        return await handleBulkRoleChange(userIds, data.role);
      
      case 'bulk-activate':
        return await handleBulkStatusChange(userIds, true);
      
      case 'bulk-deactivate':
        return await handleBulkStatusChange(userIds, false);
      
      case 'bulk-college-transfer':
        return await handleBulkCollegeTransfer(userIds, data.collegeId);
      
      case 'bulk-delete':
        return await handleBulkDelete(userIds);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Cross-college users bulk operation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleBulkPasswordReset(userIds: string[]) {
  const defaultPassword = 'ChangeMe123!';
  const hashedPassword = await bcrypt.hash(defaultPassword, 12);

  const updatedUsers = await Promise.all(
    userIds.map(async (userId) => {
      return await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
        include: { college: { select: { name: true } } }
      });
    })
  );

  return NextResponse.json({
    message: `Password reset for ${updatedUsers.length} users`,
    users: updatedUsers,
    defaultPassword
  });
}

async function handleBulkRoleChange(userIds: string[], newRole: string) {
  // Validate and cast role
  if (!isValidRole(newRole)) {
    throw new Error(`Invalid role: ${newRole}`);
  }

  const userRole = newRole as UserRole;

  const updatedUsers = await Promise.all(
    userIds.map(async (userId) => {
      return await prisma.user.update({
        where: { id: userId },
        data: { role: userRole },
        include: { college: { select: { name: true } } }
      });
    })
  );

  return NextResponse.json({
    message: `Role changed to ${newRole} for ${updatedUsers.length} users`,
    users: updatedUsers
  });
}

async function handleBulkStatusChange(userIds: string[], isActive: boolean) {
  const updatedUsers = await Promise.all(
    userIds.map(async (userId) => {
      return await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        include: { college: { select: { name: true } } }
      });
    })
  );

  const status = isActive ? 'activated' : 'deactivated';
  return NextResponse.json({
    message: `${updatedUsers.length} users ${status}`,
    users: updatedUsers
  });
}

async function handleBulkCollegeTransfer(userIds: string[], newCollegeId: string) {
  // Verify the target college exists
  const targetCollege = await prisma.college.findUnique({
    where: { id: newCollegeId }
  });

  if (!targetCollege) {
    return NextResponse.json({ error: 'Target college not found' }, { status: 404 });
  }

  const updatedUsers = await Promise.all(
    userIds.map(async (userId) => {
      return await prisma.user.update({
        where: { id: userId },
        data: { collegeId: newCollegeId },
        include: { college: { select: { name: true } } }
      });
    })
  );

  return NextResponse.json({
    message: `${updatedUsers.length} users transferred to ${targetCollege.name}`,
    users: updatedUsers
  });
}

async function handleBulkDelete(userIds: string[]) {
  const deletedUsers = await Promise.all(
    userIds.map(async (userId) => {
      return await prisma.user.delete({
        where: { id: userId },
        include: { college: { select: { name: true } } }
      });
    })
  );

  return NextResponse.json({
    message: `${deletedUsers.length} users deleted`,
    users: deletedUsers
  });
}
