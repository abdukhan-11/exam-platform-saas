import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/rbac';
import { getToken } from 'next-auth/jwt';

async function handler(req: NextRequest) {
  try {
    if (req.method !== 'GET') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }

    // Get user info from token (already verified by withRole middleware)
    const token = await getToken({ req });
    
    return NextResponse.json({
      ok: true,
      role: token?.role,
      message: 'Teacher access granted',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Teacher route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withRole(handler, ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER']);

