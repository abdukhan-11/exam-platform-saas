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

    const reportService = new AutomatedReportService();
    
    // Execute all due reports
    const executions = await reportService.executeDueReports();

    return NextResponse.json({ 
      message: `Executed ${executions.length} due reports`,
      executions 
    });

  } catch (error) {
    console.error('Execute due reports error:', error);
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

    const reportService = new AutomatedReportService();
    
    // Get active schedules to show which ones are due
    const activeSchedules = await reportService.getActiveReportSchedules();
    const now = new Date();
    
    const dueSchedules = activeSchedules.filter(schedule => 
      schedule.nextRun && schedule.nextRun <= now
    );

    return NextResponse.json({ 
      activeSchedules: activeSchedules.length,
      dueSchedules: dueSchedules.length,
      schedules: activeSchedules.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        nextRun: s.nextRun,
        isDue: s.nextRun && s.nextRun <= now
      }))
    });

  } catch (error) {
    console.error('Get due reports status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
