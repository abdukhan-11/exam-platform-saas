import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { CustomReportBuilder } from '@/lib/reporting/custom-report-builder';

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
    const { format, additionalFilters } = body;

    if (!format) {
      return NextResponse.json(
        { error: 'Export format is required' },
        { status: 400 }
      );
    }

    const reportBuilder = new CustomReportBuilder();
    const exportResult = await reportBuilder.exportCustomReportQuery(id, format, additionalFilters);

    // Return the export result
    return new NextResponse(exportResult.data, {
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        'Content-Length': exportResult.size.toString()
      }
    });

  } catch (error) {
    console.error('Export custom report query error:', error);
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
    const additionalFilters = searchParams.get('filters') ? JSON.parse(searchParams.get('filters')!) : {};

    const reportBuilder = new CustomReportBuilder();
    const exportResult = await reportBuilder.exportCustomReportQuery(id, format as 'csv' | 'excel' | 'pdf', additionalFilters);

    // Return the export result
    return new NextResponse(exportResult.data, {
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        'Content-Length': exportResult.size.toString()
      }
    });

  } catch (error) {
    console.error('Export custom report query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
