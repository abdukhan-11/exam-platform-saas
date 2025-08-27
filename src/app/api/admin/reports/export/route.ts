import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { DataExportService, ExportOptions } from '@/lib/reporting/data-export-service';

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
      exportType, 
      format, 
      filters, 
      dateRange, 
      includeCharts, 
      customFields 
    } = body;

    if (!exportType || !format) {
      return NextResponse.json(
        { error: 'Export type and format are required' },
        { status: 400 }
      );
    }

    const exportService = new DataExportService();
    const exportOptions: ExportOptions = {
      format,
      filters,
      dateRange: dateRange ? {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      } : undefined,
      includeCharts,
      customFields
    };

    let exportResult;

    switch (exportType) {
      case 'analytics':
        exportResult = await exportService.exportAnalytics(exportOptions);
        break;
      case 'colleges':
        exportResult = await exportService.exportColleges(exportOptions);
        break;
      case 'users':
        exportResult = await exportService.exportUserAnalytics(exportOptions);
        break;
      case 'activity':
        exportResult = await exportService.exportActivityLogs(exportOptions);
        break;
      case 'platform-report':
        const reportType = body.reportType || 'custom';
        exportResult = await exportService.generatePlatformReport(reportType, exportOptions);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported export type: ${exportType}` },
          { status: 400 }
        );
    }

    // Return the export result
    return new NextResponse(exportResult.data, {
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        'Content-Length': exportResult.size.toString()
      }
    });

  } catch (error) {
    console.error('Export API error:', error);
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
    const exportType = searchParams.get('type');
    const format = searchParams.get('format') || 'csv';
    const filters = searchParams.get('filters') ? JSON.parse(searchParams.get('filters')!) : {};
    const dateRange = searchParams.get('dateRange') ? JSON.parse(searchParams.get('dateRange')!) : undefined;

    if (!exportType) {
      return NextResponse.json(
        { error: 'Export type is required' },
        { status: 400 }
      );
    }

    const exportService = new DataExportService();
    const exportOptions: ExportOptions = {
      format: format as 'csv' | 'excel' | 'pdf',
      filters,
      dateRange: dateRange ? {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      } : undefined
    };

    let exportResult;

    switch (exportType) {
      case 'analytics':
        exportResult = await exportService.exportAnalytics(exportOptions);
        break;
      case 'colleges':
        exportResult = await exportService.exportColleges(exportOptions);
        break;
      case 'users':
        exportResult = await exportService.exportUserAnalytics(exportOptions);
        break;
      case 'activity':
        exportResult = await exportService.exportActivityLogs(exportOptions);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported export type: ${exportType}` },
          { status: 400 }
        );
    }

    // Return the export result
    return new NextResponse(exportResult.data, {
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        'Content-Length': exportResult.size.toString()
      }
    });

  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
