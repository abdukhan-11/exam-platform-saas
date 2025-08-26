import { NextRequest, NextResponse } from 'next/server';
import { InvitationService } from '@/lib/user-management/invitation-service';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const acceptInvitationSchema = z.object({
  token: z.string(),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, name, password } = acceptInvitationSchema.parse(body);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Accept invitation using the invitation service
    const invitationService = new InvitationService(prisma);
    
    const user = await invitationService.acceptInvitation(token, {
      name,
      password: hashedPassword,
    });

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        collegeId: user.collegeId,
      },
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Get invitation details
    const invitationService = new InvitationService(prisma);
    const invitation = await invitationService.getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Invitation has already been used or expired' },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        college: invitation.college.name,
        inviter: invitation.inviter.name || invitation.inviter.email,
        expiresAt: invitation.expiresAt,
        customMessage: invitation.customMessage,
      },
    });
  } catch (error) {
    console.error('Error getting invitation details:', error);
    
    return NextResponse.json(
      { error: 'Failed to get invitation details' },
      { status: 500 }
    );
  }
}
