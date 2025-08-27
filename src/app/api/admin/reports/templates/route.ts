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
    const systemOnly = searchParams.get('system') === 'true';

    const reportService = new AutomatedReportService();
    const templates = systemOnly 
      ? await reportService.getSystemReportTemplates()
      : await reportService.getReportTemplates();

    return NextResponse.json({ templates });

  } catch (error) {
    console.error('Get report templates error:', error);
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
      description, 
      type, 
      defaultFormat, 
      defaultFilters, 
      defaultFields, 
      includeCharts 
    } = body;

    if (!name || !type || !defaultFormat) {
      return NextResponse.json(
        { error: 'Name, type, and default format are required' },
        { status: 400 }
      );
    }

    const reportService = new AutomatedReportService();
    const template = await reportService.createReportTemplate({
      name,
      description: description || '',
      type,
      defaultFormat,
      defaultFilters: defaultFilters || {},
      defaultFields: defaultFields || [],
      includeCharts: includeCharts || false,
      isSystem: false
    });

    return NextResponse.json({ template }, { status: 201 });

  } catch (error) {
    console.error('Create report template error:', error);
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
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const reportService = new AutomatedReportService();
    const template = await reportService.updateReportTemplate(id, updates);

    return NextResponse.json({ template });

  } catch (error) {
    console.error('Update report template error:', error);
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
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const reportService = new AutomatedReportService();
    await reportService.deleteReportTemplate(id);

    return NextResponse.json({ message: 'Report template deleted successfully' });

  } catch (error) {
    console.error('Delete report template error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
