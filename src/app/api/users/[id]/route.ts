import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { userManagementService } from '@/lib/user-management/user-service';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { UpdateUserSchema } from '@/lib/user-management/user-service';
import { UserSession } from '@/types/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as UserSession | null;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!PermissionService.hasPermission(session.user.role, Permission.READ_USER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await userManagementService.findUserByEmailOrRollNo(
      undefined,
      undefined,
      session.user.collegeId || '' || undefined
    );

    if (!user || user.id !== params.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check college access
    if (!PermissionService.canAccessCollege(
      session.user.role,
      session.user.collegeId || '',
      user.collegeId || ''
    )) {
      return NextResponse.json({ error: 'Cannot access this user' }, { status: 403 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as UserSession | null;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!PermissionService.hasPermission(session.user.role, Permission.UPDATE_USER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = UpdateUserSchema.parse(body);

    // Get the user to check permissions
    const existingUser = await userManagementService.findUserByEmailOrRollNo(
      undefined,
      undefined,
      session.user.collegeId || ''
    );

    if (!existingUser || existingUser.id !== params.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check college access
    if (!PermissionService.canAccessCollege(
      session.user.role,
      session.user.collegeId || '',
      existingUser.collegeId || ''
    )) {
      return NextResponse.json({ error: 'Cannot update this user' }, { status: 403 });
    }

    // Check if user can update this specific user
    const validation = PermissionService.validateUserAction({
      userRole: session.user.role,
      userCollegeId: session.user.collegeId || '',
      userId: session.user.id,
      action: Permission.UPDATE_USER,
      resource: {
        collegeId: existingUser.collegeId || '',
        ownerId: existingUser.id,
      },
    });

    if (!validation.allowed) {
      return NextResponse.json({ error: validation.reason }, { status: 403 });
    }

    const user = await userManagementService.updateUser(params.id, validatedData);

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as UserSession | null;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!PermissionService.hasPermission(session.user.role, Permission.DELETE_USER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the user to check permissions
    const existingUser = await userManagementService.findUserByEmailOrRollNo(
      undefined,
      undefined,
      session.user.collegeId || ''
    );

    if (!existingUser || existingUser.id !== params.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check college access
    if (!PermissionService.canAccessCollege(
      session.user.role,
      session.user.collegeId || '',
      existingUser.collegeId || ''
    )) {
      return NextResponse.json({ error: 'Cannot delete this user' }, { status: 403 });
    }

    // Prevent self-deletion
    if (existingUser.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // For now, we'll deactivate instead of delete
    const user = await userManagementService.deactivateUser(params.id, session.user.id);

    return NextResponse.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
