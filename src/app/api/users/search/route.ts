import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { ProfileService } from '@/lib/user-management/profile-service';
import { prisma } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { UserRole } from '@prisma/client';
import { UserSession } from '@/types/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as UserSession;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!PermissionService.hasPermission(session.user.role, Permission.VIEW_USERS)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const role = searchParams.get('role') as UserRole | null;
    const collegeId = searchParams.get('collegeId');
    const department = searchParams.get('department');
    const isActive = searchParams.get('isActive');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build filters
    const filters: any = {};
    
    if (role) {
      filters.role = role;
    }
    
    if (collegeId) {
      // Check if user can access this college
      if (!PermissionService.canAccessCollege(
        session.user.role,
        session.user.collegeId ?? '',
        collegeId
      )) {
        return NextResponse.json({ error: 'Cannot access this college' }, { status: 403 });
      }
      filters.collegeId = collegeId;
    } else if (session.user.role !== 'SUPER_ADMIN') {
      // Non-super admins can only search within their college
      filters.collegeId = session.user.collegeId ?? '';
    }
    
    if (department) {
      filters.department = department;
    }
    
    if (isActive !== null) {
      filters.isActive = isActive === 'true';
    }

    const profileService = new ProfileService(prisma);
    const result = await profileService.searchUsers(query, filters, { limit, offset });

    return NextResponse.json({
      users: result.users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: (user as any).department,
        position: (user as any).position,
        isActive: user.isActive,
        college: {
          id: user.college.id,
          name: user.college.name,
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
