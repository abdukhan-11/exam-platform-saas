import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { verifyAccessToken } from '@/lib/auth/token-service';
import type { AppRole } from '@/types/auth';

export default async function middleware(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname;

    // Skip middleware for static files and API routes
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/static') ||
      pathname.includes('.')
    ) {
      return NextResponse.next();
    }

    // Define role-based access for dashboard paths
    const roleAccess: Record<string, AppRole[]> = {
      '/dashboard/superadmin': ['SUPER_ADMIN'],
      '/dashboard/college-admin': ['SUPER_ADMIN', 'COLLEGE_ADMIN'],
      '/dashboard/teacher': ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER'],
      '/dashboard/student': ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'STUDENT'],
    };

    // Check if the current path requires role-based access
    const requiredRoles = roleAccess[pathname];
    if (!requiredRoles) {
      return NextResponse.next();
    }

    // Try to get token from NextAuth
    let token = await getToken({ req });
    let userRole: AppRole | undefined = token?.role as AppRole | undefined;

    // Fallback to Authorization header for custom tokens
    if (!userRole) {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const raw = authHeader.slice('Bearer '.length).trim();
        const decoded = verifyAccessToken(raw);
        if (decoded && typeof decoded === 'object' && 'role' in decoded) {
          userRole = decoded.role as AppRole;
        }
      }
    }

    // If no valid authentication found, redirect to login
    if (!userRole) {
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      console.log(`Redirecting unauthenticated user to login from: ${pathname}`);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has required role
    if (!requiredRoles.includes(userRole)) {
      console.warn(`Access denied: User with role ${userRole} attempted to access ${pathname} requiring roles: ${requiredRoles.join(', ')}`);
      const forbiddenUrl = new URL('/forbidden', req.url);
      return NextResponse.redirect(forbiddenUrl);
    }

    // Allow access if user has required role
    console.log(`Access granted: User with role ${userRole} accessing ${pathname}`);
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    
    // On error, redirect to error page
    const errorUrl = new URL('/auth/error', req.url);
    errorUrl.searchParams.set('error', 'middleware_error');
    return NextResponse.redirect(errorUrl);
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
  ],
};


