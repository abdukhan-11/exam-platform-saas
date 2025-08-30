import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { CustomReportBuilder } from '@/lib/reporting/custom-report-builder';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await request.json();
    const { additionalFilters } = body;

    const reportBuilder = new CustomReportBuilder();
    const result = await reportBuilder.executeCustomReportQuery(id, additionalFilters);

    return NextResponse.json({ result });

  } catch (error) {
    console.error('Execute custom report query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const additionalFilters = searchParams.get('filters') ? JSON.parse(searchParams.get('filters')!) : {};

    const reportBuilder = new CustomReportBuilder();
    const result = await reportBuilder.executeCustomReportQuery(id, additionalFilters);

    return NextResponse.json({ result });

  } catch (error) {
    console.error('Execute custom report query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
