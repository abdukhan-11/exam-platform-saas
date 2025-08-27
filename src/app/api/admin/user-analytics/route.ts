import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { college: true }
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    // Get user analytics data
    const [
      totalUsers,
      activeUsers,
      newUsers,
      userGrowth,
      collegeUserCounts,
      userSegments
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users (users with activity in last 30 days)
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // New users in last 30 days
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // User growth (last 6 months)
      prisma.user.groupBy({
        by: ['createdAt'],
        _count: {
          id: true
        },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // College user counts for engagement calculations
      prisma.user.groupBy({
        by: ['collegeId'],
        _count: {
          id: true
        }
      }),
      
      // User segments by role
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true
        }
      })
    ]);

    // Process user growth data
    const userGrowthData = processTimeSeriesData(userGrowth, 'createdAt', 'totalUsers');
    
    // Calculate monthly growth for the last 6 months
    const monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      const monthData = userGrowthData.find(item => item.month === monthName);
      const previousMonthData = i > 0 ? userGrowthData.find(item => {
        const prevDate = new Date();
        prevDate.setMonth(prevDate.getMonth() - (i - 1));
        return item.month === prevDate.toLocaleString('default', { month: 'short' });
      }) : null;
      
      monthlyGrowth.push({
        month: monthName,
        totalUsers: monthData ? monthData.totalUsers : (i === 0 ? totalUsers : 0),
        newUsers: monthData ? monthData.newUsers : 0,
        activeUsers: monthData ? monthData.totalUsers : 0
      });
    }

    // Get engagement metrics for each college
    const colleges = await prisma.college.findMany({
      select: { id: true, name: true }
    });

    const engagementMetrics = await Promise.all(
      colleges.map(async (college) => {
        // Get activity logs for this college (mock data for now)
        const avgSessionDuration = Math.random() * 120 + 30; // 30-150 minutes
        const loginFrequency = Math.random() * 5 + 2; // 2-7 logins per week
        const featureUsage = Math.random() * 100 + 50; // 50-150 feature uses
        const retentionRate = Math.random() * 30 + 70; // 70-100%

        return {
          college: college.name,
          avgSessionDuration: Math.round(avgSessionDuration),
          loginFrequency: Math.round(loginFrequency * 10) / 10,
          featureUsage: Math.round(featureUsage),
          retentionRate: Math.round(retentionRate)
        };
      })
    );

    // Process user segments
    const segments = userSegments.map(segment => ({
      segment: segment.role,
      count: segment._count.id,
      percentage: Math.round((segment._count.id / totalUsers) * 100),
      color: getRoleColor(segment.role)
    }));

    // Calculate churn rate (mock calculation for now)
    const churnRate = Math.random() * 10 + 2; // 2-12%
    
    // Calculate average session duration (mock data for now)
    const avgSessionDuration = Math.random() * 120 + 30; // 30-150 minutes
    
    // Calculate average login frequency (mock data for now)
    const avgLoginFrequency = Math.random() * 5 + 2; // 2-7 logins per week

    const userAnalyticsData = {
      overview: {
        totalUsers,
        activeUsers,
        newUsers,
        churnRate,
        avgSessionDuration,
        avgLoginFrequency
      },
      userGrowth: monthlyGrowth,
      engagementMetrics,
      userSegments: segments
    };

    return NextResponse.json(userAnalyticsData);
  } catch (error) {
    console.error('User Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function processTimeSeriesData(data: any[], dateField: string, valueField: string) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const result = months.map((month, index) => {
    const monthData = data.find(item => {
      const date = new Date(item[dateField]);
      return date.getMonth() === index;
    });
    return {
      month,
      [valueField]: monthData ? monthData._count.id : 0,
      newUsers: monthData ? monthData._count.id : 0
    };
  });
  return result;
}

function getRoleColor(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN': return '#ff6b6b';
    case 'COLLEGE_ADMIN': return '#4ecdc4';
    case 'TEACHER': return '#45b7d1';
    case 'STUDENT': return '#96ceb4';
    default: return '#8884d8';
  }
}
