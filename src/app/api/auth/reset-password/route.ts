import { NextRequest, NextResponse } from 'next/server';
import { RecoveryService } from '@/lib/user-management/recovery-service';
import { db } from '@/lib/db';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const recoveryService = new RecoveryService(db);

    // Reset password using recovery token
    const user = await recoveryService.resetPasswordWithToken(token, password, {
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      message: 'Password reset successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    
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
      { error: 'Failed to reset password' },
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
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }

    const recoveryService = new RecoveryService(db);
    const recoveryRequest = await recoveryService.getRecoveryRequest(token);

    if (!recoveryRequest) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 404 }
      );
    }

    if (recoveryRequest.used) {
      return NextResponse.json(
        { error: 'Reset token has already been used' },
        { status: 400 }
      );
    }

    if (recoveryRequest.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    if (recoveryRequest.type !== 'PASSWORD_RESET') {
      return NextResponse.json(
        { error: 'Invalid reset token type' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: recoveryRequest.user.email,
      expiresAt: recoveryRequest.expiresAt,
    });
  } catch (error) {
    console.error('Error validating reset token:', error);
    
    return NextResponse.json(
      { error: 'Failed to validate reset token' },
      { status: 500 }
    );
  }
}