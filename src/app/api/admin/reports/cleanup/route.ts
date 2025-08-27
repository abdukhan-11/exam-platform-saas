import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { AutomatedReportService } from '@/lib/reporting/automated-report-service';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { retentionDays = 90 } = body;

    const reportService = new AutomatedReportService();
    
    // Clean up old executions
    const deletedCount = await reportService.cleanupOldExecutions(retentionDays);

    return NextResponse.json({ 
      message: `Cleaned up ${deletedCount} old report executions`,
      deletedCount,
      retentionDays
    });

  } catch (error) {
    console.error('Cleanup old executions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const retentionDays = parseInt(searchParams.get('retentionDays') || '90');

    const reportService = new AutomatedReportService();
    
    // Get execution history to show what would be cleaned up
    const history = await reportService.getReportExecutionHistory(undefined, 1000);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const oldExecutions = history.filter(execution => 
      execution.createdAt < cutoffDate
    );

    return NextResponse.json({ 
      totalExecutions: history.length,
      oldExecutions: oldExecutions.length,
      cutoffDate,
      retentionDays,
      wouldBeDeleted: oldExecutions.map(e => ({
        id: e.id,
        createdAt: e.createdAt,
        status: e.status
      }))
    });

  } catch (error) {
    console.error('Get cleanup status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
