import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { ActivityLogger } from '@/lib/user-management/activity-logger';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { UserSession } from '@/types/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as UserSession | null;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!PermissionService.hasPermission(session.user.role, Permission.READ_USER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const collegeId = searchParams.get('collegeId');
    const role = searchParams.get('role') as any;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const format = searchParams.get('format') as 'csv' | 'json' | null;

    // Build filters
    const filters: any = {};
    
    if (userId) {
      filters.userId = userId;
    }
    
    if (action) {
      filters.action = action;
    }
    
    if (resourceType) {
      filters.resourceType = resourceType;
    }
    
    if (collegeId) {
      // Check if user can access this college
      if (!PermissionService.canAccessCollege(
        session.user.role,
        session.user.collegeId || '',
        collegeId || ''
      )) {
        return NextResponse.json({ error: 'Cannot access this college' }, { status: 403 });
      }
      filters.collegeId = collegeId;
    } else if (session.user.role !== 'SUPER_ADMIN') {
      // Non-super admins can only view activities within their college
      filters.collegeId = session.user.collegeId;
    }
    
    if (role) {
      filters.role = role;
    }
    
    if (startDate) {
      filters.startDate = new Date(startDate);
    }
    
    if (endDate) {
      filters.endDate = new Date(endDate);
    }
    
    filters.limit = limit;
    filters.offset = offset;

    const activityLogger = new ActivityLogger(db);

    // Handle export requests
    if (format) {
      const exportResult = await activityLogger.exportActivityLogs(filters, format);
      
      return new Response(exportResult.data, {
        headers: {
          'Content-Type': exportResult.mimeType,
          'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        },
      });
    }

    // Get activity logs
    const result = await activityLogger.getUserActivities(filters);

    return NextResponse.json({
      activities: result.activities,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error getting activity logs:', error);
    
    return NextResponse.json(
      { error: 'Failed to get activity logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as UserSession | null;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, resourceType, resourceId, details } = body;

    if (!action || !resourceType) {
      return NextResponse.json(
        { error: 'Action and resourceType are required' },
        { status: 400 }
      );
    }

    const activityLogger = new ActivityLogger(db);

    const activityLog = await activityLogger.logActivity({
      userId: session.user.id,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      sessionId: (session.user as any).sessionId,
    });

    return NextResponse.json(activityLog);
  } catch (error) {
    console.error('Error logging activity:', error);
    
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    );
  }
}