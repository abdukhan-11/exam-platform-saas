import { PrismaClient } from '@prisma/client';
import { AppRole } from '@/types/auth';
import { auditLogger } from '@/lib/security/audit-logger';
import { db } from '@/lib/db';

export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  sessionId?: string;
  collegeId?: string;
  role?: AppRole;
}

export interface ActivityFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  collegeId?: string;
  role?: AppRole;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ActivitySummary {
  totalActivities: number;
  uniqueUsers: number;
  topActions: Array<{
    action: string;
    count: number;
  }>;
  topUsers: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
  activitiesByDay: Array<{
    date: string;
    count: number;
  }>;
  activitiesByRole: Array<{
    role: AppRole;
    count: number;
  }>;
}

export class ActivityLogger {
  private db: PrismaClient;
  private auditLogger: any;

  constructor(prisma: PrismaClient) {
    this.db = prisma;
    this.auditLogger = auditLogger;
  }

  /**
   * Log user activity
   */
  async logActivity(data: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<ActivityLogEntry> {
    // Get user details for additional context
    const user = await this.db.user.findUnique({
      where: { id: data.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        collegeId: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create activity log entry
    const activityLog = await (this.db as any).activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        details: data.details || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
        collegeId: user.collegeId,
        role: user.role,
      },
    });

    // Also log to audit system
    this.auditLogger.logUserAction(data.action, {
      userId: data.userId,
      sessionId: data.sessionId,
      ipAddress: data.ipAddress,
      collegeId: user.collegeId,
      role: user.role,
      resource: data.resourceType,
      action: data.action,
      metadata: data.details,
    });

    return activityLog as ActivityLogEntry;
  }

  /**
   * Get user activity logs
   */
  async getUserActivities(filters: ActivityFilters): Promise<{
    activities: ActivityLogEntry[];
    total: number;
  }> {
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.collegeId) {
      where.collegeId = filters.collegeId;
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    const [activities, total] = await Promise.all([
      (this.db as any).activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      (this.db as any).activityLog.count({ where }),
    ]);

    return {
      activities: (activities as any[]).map((activity: any) => ({
        id: activity.id,
        userId: activity.userId,
        action: activity.action,
        resourceType: activity.resourceType,
        resourceId: activity.resourceId,
        details: activity.details as Record<string, any>,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        timestamp: activity.timestamp,
        sessionId: activity.sessionId,
        collegeId: activity.collegeId,
        role: activity.role,
      })),
      total,
    };
  }

  /**
   * Get activity summary
   */
  async getActivitySummary(
    collegeId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ActivitySummary> {
    const where: any = {};

    if (collegeId) {
      where.collegeId = collegeId;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    // Get total activities
    const totalActivities = await (this.db as any).activityLog.count({ where });

    // Get unique users
    const uniqueUsers = await (this.db as any).activityLog.findMany({
      where,
      select: { userId: true },
      distinct: ['userId'],
    });

    // Get top actions
    const topActions = await (this.db as any).activityLog.groupBy({
      by: ['action'],
      where,
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
      take: 10,
    });

    // Get top users
    const topUsers = await (this.db as any).activityLog.groupBy({
      by: ['userId'],
      where,
      _count: {
        userId: true,
      },
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: 10,
    });

    // Get user names for top users
    const topUserIds = (topUsers as any[]).map((u: any) => u.userId);
    const users = await this.db.user.findMany({
      where: { id: { in: topUserIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map((u: any) => [u.id, u]));

    // Get activities by day
    const activitiesByDay = await this.db.$queryRaw<Array<{
      date: string;
      count: number;
    }>>`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM "ActivityLog"
      WHERE ${collegeId ? `"collegeId" = ${collegeId} AND` : ''}
        ${startDate ? `timestamp >= ${startDate} AND` : ''}
        ${endDate ? `timestamp <= ${endDate}` : '1=1'}
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
      LIMIT 30
    `;

    // Get activities by role
    const activitiesByRole = await (this.db as any).activityLog.groupBy({
      by: ['role'],
      where,
      _count: {
        role: true,
      },
      orderBy: {
        _count: {
          role: 'desc',
        },
      },
    });

    return {
      totalActivities,
      uniqueUsers: uniqueUsers.length,
      topActions: (topActions as any[]).map((action: any) => ({
        action: action.action,
        count: action._count.action,
      })),
      topUsers: (topUsers as any[]).map((user: any) => {
        const userInfo = userMap.get(user.userId) as { name?: string; email: string } | undefined;
        return {
          userId: user.userId,
          userName: (userInfo?.name as string | undefined) || userInfo?.email || 'Unknown',
          count: user._count.userId,
        };
      }),
      activitiesByDay: (activitiesByDay as any[]).map((day: any) => ({
        date: day.date,
        count: Number(day.count),
      })),
      activitiesByRole: (activitiesByRole as any[]).map((role: any) => ({
        role: role.role as AppRole,
        count: role._count.role,
      })),
    };
  }

  /**
   * Get user activity timeline
   */
  async getUserTimeline(
    userId: string,
    limit: number = 50
  ): Promise<ActivityLogEntry[]> {
    const activities = await (this.db as any).activityLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return (activities as any[]).map((activity: any) => ({
      id: activity.id,
      userId: activity.userId,
      action: activity.action,
      resourceType: activity.resourceType,
      resourceId: activity.resourceId,
      details: activity.details as Record<string, any>,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
      timestamp: activity.timestamp,
      sessionId: activity.sessionId,
      collegeId: activity.collegeId,
      role: activity.role,
    }));
  }

  /**
   * Get recent activities for dashboard
   */
  async getRecentActivities(
    collegeId?: string,
    limit: number = 20
  ): Promise<Array<ActivityLogEntry & { user: { name: string; email: string } }>> {
    const where: any = {};

    if (collegeId) {
      where.collegeId = collegeId;
    }

    const activities = await (this.db as any).activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return (activities as any[]).map((activity: any) => ({
      id: activity.id,
      userId: activity.userId,
      action: activity.action,
      resourceType: activity.resourceType,
      resourceId: activity.resourceId,
      details: activity.details as Record<string, any>,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
      timestamp: activity.timestamp,
      sessionId: activity.sessionId,
      collegeId: activity.collegeId,
      role: activity.role,
      user: activity.user,
    }));
  }

  /**
   * Clean up old activity logs
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await (this.db as any).activityLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return (result as { count: number }).count;
  }

  /**
   * Export activity logs
   */
  async exportActivityLogs(
    filters: ActivityFilters,
    format: 'csv' | 'json' = 'csv'
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    const { activities } = await this.getUserActivities({
      ...filters,
      limit: 10000, // Large limit for export
    });

    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      return {
        data: JSON.stringify(activities, null, 2),
        filename: `activity-logs-${timestamp}.json`,
        mimeType: 'application/json',
      };
    }

    // CSV format
    const headers = [
      'ID',
      'User ID',
      'Action',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'User Agent',
      'Timestamp',
      'Session ID',
      'College ID',
      'Role',
      'Details',
    ];

    const rows = activities.map(activity => [
      activity.id,
      activity.userId,
      activity.action,
      activity.resourceType,
      activity.resourceId || '',
      activity.ipAddress || '',
      activity.userAgent || '',
      activity.timestamp.toISOString(),
      activity.sessionId || '',
      activity.collegeId || '',
      activity.role || '',
      JSON.stringify(activity.details),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return {
      data: csvContent,
      filename: `activity-logs-${timestamp}.csv`,
      mimeType: 'text/csv',
    };
  }
}
