import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyRefreshToken, 
  generateAccessToken, 
  rotateRefreshToken,
  validateRefreshToken 
} from '@/lib/auth/token-service';
import { AppRole } from '@/types/auth';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Validate refresh token exists and is not revoked
    const isValid = await validateRefreshToken(refreshToken);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Verify the refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      id: payload.id,
      role: payload.role as AppRole,
    });

    // Rotate refresh token for security
    const newRefreshToken = await rotateRefreshToken(
      refreshToken,
      payload.id,
      payload.role as AppRole
    );

    if (!newRefreshToken) {
      return NextResponse.json(
        { error: 'Failed to rotate refresh token' },
        { status: 500 }
      );
    }

    // Set HTTP-only cookie for refresh token
    const response = NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
