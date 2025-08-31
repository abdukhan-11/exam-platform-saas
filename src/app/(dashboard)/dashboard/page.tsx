'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/auth/login');
      return;
    }

    // Redirect to appropriate dashboard based on user role
    const user = session.user as any;
    const role = user.role;

    let redirectUrl = '/dashboard';

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

    if (redirectUrl !== '/dashboard') {
      router.push(redirectUrl);
    }
  }, [session, status, router]);

  // Show loading while redirecting
  if (status === 'loading') {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Fallback content if no redirect happens
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Redirecting to your dashboard...</p>
    </div>
  );
}
