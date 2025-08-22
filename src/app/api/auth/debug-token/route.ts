import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken } from '@/lib/auth/token-service';
import { AppRole } from '@/types/auth';

export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ 
      error: 'Debug endpoint not available in production',
      code: 'PRODUCTION_BLOCKED'
    }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { id = 'debug-user', role = 'SUPER_ADMIN' } = body as { 
      id?: string; 
      role?: AppRole 
    };

    // Validate role
    const validRoles: AppRole[] = ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'STUDENT'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role specified',
        code: 'INVALID_ROLE',
        valid: validRoles
      }, { status: 400 });
    }

    // Validate ID
    if (!id || typeof id !== 'string' || id.length < 1) {
      return NextResponse.json({ 
        error: 'Invalid ID specified',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const token = generateAccessToken({ id, role });
    
    console.log(`Debug token generated for role: ${role}, id: ${id}`);
    
    return NextResponse.json({ 
      accessToken: token,
      role,
      id,
      expiresIn: '1h',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug token generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate debug token',
      code: 'GENERATION_ERROR'
    }, { status: 500 });
  }
}

