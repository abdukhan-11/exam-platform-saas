import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { AutomatedReportService } from '@/lib/reporting/automated-report-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const body = await request.json();
    const { format, filters, customFields, includeCharts } = body;

    const reportService = new AutomatedReportService();
    
    // Generate report from template
    const result = await reportService.generateReportFromTemplate(id, {
      format,
      filters,
      customFields,
      includeCharts
    });

    // Return the generated report
    return new NextResponse(result.data, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.size.toString()
      }
    });

  } catch (error) {
    console.error('Generate report from template error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const filters = searchParams.get('filters') ? JSON.parse(searchParams.get('filters')!) : {};
    const customFields = searchParams.get('fields') ? searchParams.get('fields')!.split(',') : undefined;
    const includeCharts = searchParams.get('charts') === 'true';

    const reportService = new AutomatedReportService();
    
    // Generate report from template
    const result = await reportService.generateReportFromTemplate(id, {
      format: format as 'csv' | 'excel' | 'pdf',
      filters,
      customFields,
      includeCharts
    });

    // Return the generated report
    return new NextResponse(result.data, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.size.toString()
      }
    });

  } catch (error) {
    console.error('Generate report from template error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
