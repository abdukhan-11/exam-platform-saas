import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { userManagementService } from '@/lib/user-management/user-service';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!PermissionService.hasPermission(session.user.role, Permission.DEACTIVATE_USER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the user to check permissions
    const existingUser = await userManagementService.findUserByEmailOrRollNo(
      undefined,
      undefined,
      session.user.collegeId || undefined
    );

    if (!existingUser || existingUser.id !== params.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check college access (only if both college IDs are defined)
    if (session.user.collegeId && existingUser.collegeId &&
        !PermissionService.canAccessCollege(
          session.user.role,
          session.user.collegeId,
          existingUser.collegeId
        )) {
      return NextResponse.json({ error: 'Cannot deactivate this user' }, { status: 403 });
    }

    // Prevent self-deactivation
    if (existingUser.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    const user = await userManagementService.deactivateUser(params.id, session.user.id);

    return NextResponse.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    console.error('Error deactivating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
