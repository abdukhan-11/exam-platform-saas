import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ redirectUrl: '/auth/login' }, { status: 401 });
    }

    const user = session.user as any;
    const role = user.role;

    let redirectUrl = '/dashboard';

    // Determine redirect URL based on role
    switch (role) {
      case 'SUPER_ADMIN':
        redirectUrl = '/dashboard/superadmin';
        break;
      case 'COLLEGE_ADMIN':
        // All college admins go to college-admin dashboard (handles both admin and teacher functions)
        redirectUrl = '/dashboard/college-admin';
        break;
      case 'STUDENT':
        redirectUrl = '/dashboard/student';
        break;
      default:
        redirectUrl = '/dashboard';
    }

    return NextResponse.json({ redirectUrl });
  } catch (error) {
    console.error('Error getting redirect URL:', error);
    return NextResponse.json({ redirectUrl: '/dashboard' }, { status: 500 });
  }
}
