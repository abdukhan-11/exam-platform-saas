import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { AutomatedReportService } from '@/lib/reporting/automated-report-service';

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
    const activeOnly = searchParams.get('active') === 'true';

    const reportService = new AutomatedReportService();
    const schedules = activeOnly 
      ? await reportService.getActiveReportSchedules()
      : await reportService.getReportSchedules();

    return NextResponse.json({ schedules });

  } catch (error) {
    console.error('Get report schedules error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const { 
      name, 
      type, 
      format, 
      recipients, 
      time, 
      dayOfWeek, 
      dayOfMonth, 
      filters, 
      customFields, 
      includeCharts 
    } = body;

    if (!name || !type || !format || !recipients || !time) {
      return NextResponse.json(
        { error: 'Name, type, format, recipients, and time are required' },
        { status: 400 }
      );
    }

    const reportService = new AutomatedReportService();
    const schedule = await reportService.createReportSchedule({
      name,
      type,
      format,
      recipients,
      time,
      dayOfWeek,
      dayOfMonth,
      isActive: true,
      filters: filters || {},
      customFields: customFields || [],
      includeCharts: includeCharts || false,
      createdBy: session.user.id
    });

    return NextResponse.json({ schedule }, { status: 201 });

  } catch (error) {
    console.error('Create report schedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    const reportService = new AutomatedReportService();
    const schedule = await reportService.updateReportSchedule(id, updates);

    return NextResponse.json({ schedule });

  } catch (error) {
    console.error('Update report schedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    const reportService = new AutomatedReportService();
    await reportService.deleteReportSchedule(id);

    return NextResponse.json({ message: 'Report schedule deleted successfully' });

  } catch (error) {
    console.error('Delete report schedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
