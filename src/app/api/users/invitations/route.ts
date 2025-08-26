import { NextRequest, NextResponse } from 'next/server';
import { getTypedServerSession } from '@/lib/auth/session-utils';
import { InvitationService } from '@/lib/user-management/invitation-service';
import { prisma } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await getTypedServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!PermissionService.hasPermission(session.user.role, Permission.VIEW_USERS)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'FAILED' | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const collegeId = searchParams.get('collegeId');

    // Determine which college to get invitations for
    let targetCollegeId = session.user.collegeId;
    
    // SUPER_ADMIN can view invitations for any college
    if (session.user.role === 'SUPER_ADMIN' && collegeId) {
      targetCollegeId = collegeId;
    }

    // Get invitations using the invitation service
    const invitationService = new InvitationService(prisma);
    
    const result = await invitationService.getCollegeInvitations(targetCollegeId ?? '', {
      status: status || undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      invitations: result.invitations.map(invitation => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        college: invitation.college.name,
        inviter: invitation.inviter.name || invitation.inviter.email,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
        resendCount: invitation.resendCount,
        lastResentAt: invitation.lastResentAt,
        customMessage: invitation.customMessage,
      })),
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error getting invitations:', error);
    
    return NextResponse.json(
      { error: 'Failed to get invitations' },
      { status: 500 }
    );
  }
}
