import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { InvitationService } from '@/lib/user-management/invitation-service';
import { db } from '@/lib/db';
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

    // Type assertion for custom session properties
    const user = session.user as any;
    
    // Check permission
    if (!PermissionService.hasPermission(user.role, Permission.INVITE_USER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invitationId = params.id;

    // Resend invitation using the invitation service
    const invitationService = new InvitationService(db);
    
    await invitationService.resendInvitation(invitationId, user.id);

    return NextResponse.json({
      message: 'Invitation resent successfully',
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}
