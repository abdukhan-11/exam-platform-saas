import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { userManagementService } from '@/lib/user-management/user-service';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { CreateUserSchema } from '@/lib/user-management/user-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Type assertion for custom session properties
    const user = session.user as any;
    
    // Check permission
    if (!PermissionService.hasPermission(user.role, Permission.READ_USER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const collegeId = searchParams.get('collegeId');
    const role = searchParams.get('role') as any;
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate college access
    if (collegeId && !PermissionService.canAccessCollege(
      user.role,
      user.collegeId,
      collegeId
    )) {
      return NextResponse.json({ error: 'Cannot access this college' }, { status: 403 });
    }

    const result = await userManagementService.getUsers({
      collegeId: collegeId || user.collegeId,
      role,
      isActive: isActive ? isActive === 'true' : undefined,
      search: search || undefined,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Type assertion for custom session properties
    const user = session.user as any;
    
    // Check permission
    if (!PermissionService.hasPermission(user.role, Permission.CREATE_USER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate request data
    const validatedData = CreateUserSchema.parse({
      ...body,
      collegeId: body.collegeId || user.collegeId,
    });

    // Check college access
    if (!PermissionService.canAccessCollege(
      user.role,
      user.collegeId,
      validatedData.collegeId
    )) {
      return NextResponse.json({ error: 'Cannot create users in this college' }, { status: 403 });
    }

    const newUser = await userManagementService.createUser(validatedData);

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    
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
