import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequestWithAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;
    
    // If no token, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    const userRole = token?.role;
    const collegeId = token?.collegeId;

    // Ensure we have the required token properties
    if (!userRole) {
      console.error('Missing user role in token');
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // Super Admin can access everything
    if (userRole === 'SUPER_ADMIN') {
      return NextResponse.next();
    }

    // Check if user has a college assigned (except for super admin)
    if (!collegeId && userRole !== 'SUPER_ADMIN') {
      // Redirect to college selection if no college is assigned
      if (pathname !== '/college/select' && !pathname.startsWith('/auth/')) {
        return NextResponse.redirect(new URL('/college/select', req.url));
      }
    }

    // College Admin routes
    if (pathname.startsWith('/dashboard/college-admin')) {
      if (userRole !== 'COLLEGE_ADMIN') {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }
      // Ensure college admin can only access their own college
      if (collegeId && pathname.includes('/colleges/')) {
        const urlCollegeId = pathname.split('/colleges/')[1]?.split('/')[0];
        if (urlCollegeId && urlCollegeId !== collegeId) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
      }
      return NextResponse.next();
    }

    // Teacher routes
    if (pathname.startsWith('/dashboard/teacher')) {
      if (userRole !== 'TEACHER') {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }
      // Ensure teacher can only access their own college
      if (collegeId && pathname.includes('/colleges/')) {
        const urlCollegeId = pathname.split('/colleges/')[1]?.split('/')[0];
        if (urlCollegeId && urlCollegeId !== collegeId) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
      }
      return NextResponse.next();
    }

    // Student routes
    if (pathname.startsWith('/dashboard/student')) {
      if (userRole !== 'STUDENT') {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }
      // Ensure student can only access their own college
      if (collegeId && pathname.includes('/colleges/')) {
        const urlCollegeId = pathname.split('/colleges/')[1]?.split('/')[0];
        if (urlCollegeId && urlCollegeId !== collegeId) {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
      }
      return NextResponse.next();
    }

    // Super Admin specific routes
    if (pathname.startsWith('/dashboard/superadmin')) {
      if (userRole !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }
      return NextResponse.next();
    }

    // Protected API routes
    if (pathname.startsWith('/api/protected')) {
      // All authenticated users can access protected API routes
      // Additional role-based checks can be added here
      return NextResponse.next();
    }

    // Default: allow access for authenticated users
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/protected/:path*',
    '/admin/:path*',
    '/college/:path*',
  ],
};


