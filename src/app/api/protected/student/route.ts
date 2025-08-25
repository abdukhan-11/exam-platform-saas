import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/rbac';
import { getToken } from 'next-auth/jwt';
import { AppRole } from '@/types/auth';

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
      message: 'Student access granted',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Student route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withRole(handler, [AppRole.SUPER_ADMIN, AppRole.COLLEGE_ADMIN, AppRole.TEACHER, AppRole.STUDENT]);

