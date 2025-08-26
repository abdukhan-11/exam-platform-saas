import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { ActivityLogger } from '@/lib/user-management/activity-logger';
import { prisma } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;

    // Users can view their own activity, or admins can view any user's activity
    if (session.user.id !== userId) {
      if (!PermissionService.hasPermission(session.user.role, Permission.VIEW_USERS)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const activityLogger = new ActivityLogger(prisma);

    const activities = await activityLogger.getUserTimeline(userId, limit);

    return NextResponse.json({
      activities,
      total: activities.length,
    });
  } catch (error) {
    console.error('Error getting user activity:', error);
    
    return NextResponse.json(
      { error: 'Failed to get user activity' },
      { status: 500 }
    );
  }
}
