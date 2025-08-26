import { NextRequest, NextResponse } from 'next/server';
import { getTypedServerSession } from '@/lib/auth/session-utils';
import { ActivityLogger } from '@/lib/user-management/activity-logger';
import { prisma } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await getTypedServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!PermissionService.hasPermission(session.user.role, Permission.VIEW_USERS)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const collegeId = searchParams.get('collegeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Check college access
    if (collegeId && !PermissionService.canAccessCollege(
      session.user.role,
      session.user.collegeId ?? '',
      collegeId
    )) {
      return NextResponse.json({ error: 'Cannot access this college' }, { status: 403 });
    }

    // Use user's college if not specified and not SUPER_ADMIN
    const targetCollegeId = collegeId || (session.user.role !== 'SUPER_ADMIN' ? session.user.collegeId ?? undefined : undefined);

    const activityLogger = new ActivityLogger(prisma);

    const summary = await activityLogger.getActivitySummary(
      targetCollegeId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error getting activity summary:', error);
    
    return NextResponse.json(
      { error: 'Failed to get activity summary' },
      { status: 500 }
    );
  }
}
