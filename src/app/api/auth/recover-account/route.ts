import { NextRequest, NextResponse } from 'next/server';
import { RecoveryService, RecoveryRequestWithUser } from '@/lib/user-management/recovery-service';
import { db } from '@/lib/db';
import { z } from 'zod';

const recoverAccountSchema = z.object({
  email: z.string().email(),
});

const confirmRecoverySchema = z.object({
  token: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = recoverAccountSchema.parse(body);

    const recoveryService = new RecoveryService(db);

    // Check rate limiting
    const rateLimit = await recoveryService.checkRecoveryRateLimit(email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many account recovery requests. Please try again later.',
          resetAt: rateLimit.resetAt,
        },
        { status: 429 }
      );
    }

    // Create account recovery request
    const recoveryRequest = await recoveryService.createAccountRecoveryRequest(email, {
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      message: 'Account recovery email sent successfully',
      expiresAt: recoveryRequest.expiresAt,
    });
  } catch (error) {
    console.error('Error creating account recovery request:', error);
    
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
      { error: 'Failed to process account recovery request' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = confirmRecoverySchema.parse(body);

    const recoveryService = new RecoveryService(db);

    // Recover account using recovery token
    const user = await recoveryService.recoverAccount(token, {
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      message: 'Account recovered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Error recovering account:', error);
    
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
      { error: 'Failed to recover account' },
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
        { error: 'Recovery token is required' },
        { status: 400 }
      );
    }

    const recoveryService = new RecoveryService(db);
    const recoveryRequest: RecoveryRequestWithUser | null = await recoveryService.getRecoveryRequest(token);

    if (!recoveryRequest) {
      return NextResponse.json(
        { error: 'Invalid or expired recovery token' },
        { status: 404 }
      );
    }

    if (recoveryRequest.used) {
      return NextResponse.json(
        { error: 'Recovery token has already been used' },
        { status: 400 }
      );
    }

    if (recoveryRequest.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Recovery token has expired' },
        { status: 400 }
      );
    }

    if (recoveryRequest.type !== 'ACCOUNT_RECOVERY') {
      return NextResponse.json(
        { error: 'Invalid recovery token type' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: recoveryRequest.user.email,
      name: recoveryRequest.user.name,
      expiresAt: recoveryRequest.expiresAt,
    });
  } catch (error) {
    console.error('Error validating recovery token:', error);
    
    return NextResponse.json(
      { error: 'Failed to validate recovery token' },
      { status: 500 }
    );
  }
}
