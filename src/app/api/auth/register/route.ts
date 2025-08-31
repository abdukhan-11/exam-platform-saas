import { NextRequest, NextResponse } from 'next/server';
import { registerUser, registerSuperAdmin } from '@/lib/auth/auth-service';
import { RegisterCredentials } from '@/types/auth';

export async function POST(req: NextRequest) {
  try {
    const credentials: RegisterCredentials = await req.json();

    // Validate required fields
    if (!credentials.name || !credentials.email || !credentials.password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (credentials.password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Simple password validation - just length requirement
    if (credentials.password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate name length
    if (credentials.name.length < 2 || credentials.name.length > 50) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 50 characters long' },
        { status: 400 }
      );
    }

    // Validate email length
    if (credentials.email.length > 255) {
      return NextResponse.json(
        { error: 'Email is too long' },
        { status: 400 }
      );
    }

    let result;
    
    // Validate role if provided
    if (credentials.role && !['STUDENT', 'COLLEGE_ADMIN', 'SUPER_ADMIN'].includes(credentials.role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // If role is SUPER_ADMIN, use super admin registration
    if (credentials.role === 'SUPER_ADMIN') {
      result = await registerSuperAdmin(credentials);
    } else {
      result = await registerUser(credentials);
    }

    // Set HTTP-only cookie for refresh token
    const response = NextResponse.json({
      user: result.user,
      accessToken: result.accessToken,
    });

    response.cookies.set('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      if (error.message.includes('Invalid')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
