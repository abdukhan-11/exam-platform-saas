import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequestWithAuth } from 'next-auth/middleware';
import { AppRole, isValidRole } from '@/types/auth';

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;
    
    // Allow unauthenticated access to public/auth routes explicitly
    const publicPaths = [
      '/auth/login',
      '/auth/logout',
      '/auth/error',
      '/auth/login-student',
      '/auth/superadmin',
      '/college/select',
      '/',
    ];
    if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return NextResponse.next();
    }

    // If no token for protected routes, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    const userRole = token?.role;
    const collegeId = token?.collegeId;

    // Ensure we have the required token properties
    if (!userRole || !isValidRole(userRole)) {
      console.error('Missing or invalid user role in token');
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // Use string comparisons to avoid TypeScript issues
    const role = userRole as string;

    // Super Admin can access everything
    if (role === 'SUPER_ADMIN') {
      return NextResponse.next();
    }

    // Check if user has a college assigned (except for super admin)
    if (!collegeId && role !== 'SUPER_ADMIN') {
      // Redirect to college selection if no college is assigned
      if (pathname !== '/college/select' && !pathname.startsWith('/auth/')) {
        return NextResponse.redirect(new URL('/college/select', req.url));
      }
    }

    // College Admin routes
    if (pathname.startsWith('/dashboard/college-admin')) {
      if (role !== 'COLLEGE_ADMIN') {
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

    // Teacher routes now accessible by college admin
    if (pathname.startsWith('/dashboard/teacher')) {
      if (role !== 'COLLEGE_ADMIN') {
        return NextResponse.redirect(new URL('/forbidden', req.url));
      }
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
      if (role !== 'STUDENT') {
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
      if (role !== 'SUPER_ADMIN') {
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
    const res = NextResponse.next();

    // Security headers
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Basic CSP (can be customized)
    const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || '';
    const sentryIngest = process.env.NEXT_PUBLIC_SENTRY_DSN ? new URL(process.env.NEXT_PUBLIC_SENTRY_DSN).host : '';
    const connectSrc = ["'self'", appOrigin, 'https://fonts.googleapis.com', 'https://fonts.gstatic.com']
      .concat(sentryIngest ? [`https://${sentryIngest}`] : [])
      .filter(Boolean)
      .join(' ');
    res.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "img-src 'self' data:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        `connect-src ${connectSrc}`,
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    );

    // HTTPS enforcement in production
    if (process.env.NODE_ENV === 'production') {
      res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
      const proto = req.headers.get('x-forwarded-proto');
      if (proto && proto !== 'https') {
        const httpsUrl = new URL(req.url);
        httpsUrl.protocol = 'https:';
        return NextResponse.redirect(httpsUrl);
      }
    }

    // CORS for API routes (allowlist + OPTIONS preflight)
    if (pathname.startsWith('/api/')) {
      const origin = req.headers.get('origin') || '';
      const allowlist = [
        process.env.NEXT_PUBLIC_APP_ORIGIN || '',
        process.env.NEXTAUTH_URL || 'http://localhost:3000'
      ].filter(Boolean);

      if (allowlist.includes(origin)) {
        res.headers.set('Access-Control-Allow-Origin', origin);
        res.headers.set('Vary', 'Origin');
        res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.headers.set('Access-Control-Allow-Credentials', 'true');
      }

      if (req.method === 'OPTIONS') {
        return new NextResponse(null, { status: 204, headers: res.headers });
      }
    }

    return res;
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;
        const publicPaths = [
          '/auth/login',
          '/auth/logout',
          '/auth/error',
          '/auth/login-student',
          '/auth/superadmin',
          '/college/select',
          '/',
        ];
        if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
          return true;
        }
        // Only require auth for matched routes (dashboard/admin/api/protected)
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // App pages requiring auth
    '/dashboard/:path*',
    '/admin/:path*',
    // Protected API namespace only (avoid intercepting all API routes like auth, uploads, webhooks)
    '/api/protected/:path*',
  ],
};


