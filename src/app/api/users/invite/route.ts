import { NextRequest, NextResponse } from 'next/server';
import { getTypedServerSession } from '@/lib/auth/session-utils';
import { userManagementService, UserInvitationSchema } from '@/lib/user-management/user-service';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { InvitationService } from '@/lib/user-management/invitation-service';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getTypedServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!PermissionService.hasPermission(session.user.role, Permission.INVITE_USER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate request data
    const validatedData = UserInvitationSchema.parse({
      ...body,
      collegeId: body.collegeId || session.user.collegeId,
      invitedBy: session.user.id,
    });

    // Check college access
    if (!PermissionService.canAccessCollege(
      session.user.role,
      session.user.collegeId ?? '',
      validatedData.collegeId
    )) {
      return NextResponse.json({ error: 'Cannot invite users to this college' }, { status: 403 });
    }

    // Use the invitation service for email functionality
    const invitationService = new InvitationService(prisma);
    const invitation = await invitationService.createInvitation({
      email: validatedData.email,
      role: validatedData.role,
      collegeId: validatedData.collegeId,
      invitedBy: validatedData.invitedBy,
      expiresInHours: 72, // Default 72 hours
      customMessage: validatedData.message,
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error('Error creating user invitation:', error);
    
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
