import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, revokeAllUserTokens } from '@/lib/auth/token-service';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const payload = verifyAccessToken(accessToken);

    if (payload?.id) {
      // Revoke all refresh tokens for the user (ignore errors for test users)
      try {
        await revokeAllUserTokens(payload.id);
      } catch (tokenError) {
        console.warn('Could not revoke tokens for user (may be test user):', tokenError instanceof Error ? tokenError.message : String(tokenError));
      }
    }

    // Clear the refresh token cookie
    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
