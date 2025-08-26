import { NextRequest, NextResponse } from 'next/server';
import { RecoveryService } from '@/lib/user-management/recovery-service';
import { db } from '@/lib/db';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    const recoveryService = new RecoveryService(db);

    // Check rate limiting
    const rateLimit = await recoveryService.checkRecoveryRateLimit(email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many password reset requests. Please try again later.',
          resetAt: rateLimit.resetAt,
        },
        { status: 429 }
      );
    }

    // Create password reset request
    const recoveryRequest = await recoveryService.createPasswordResetRequest(email, {
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      message: 'Password reset email sent successfully',
      expiresAt: recoveryRequest.expiresAt,
    });
  } catch (error) {
    console.error('Error creating password reset request:', error);
    
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
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}