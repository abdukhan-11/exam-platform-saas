import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { CustomReportBuilder } from '@/lib/reporting/custom-report-builder';

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
    const fields = searchParams.get('fields') === 'true';

    const reportBuilder = new CustomReportBuilder();
    
    let queries;
    if (activeOnly) {
      queries = await reportBuilder.getActiveCustomReportQueries();
    } else {
      queries = await reportBuilder.getCustomReportQueries();
    }

    let result: any = { queries };

    if (fields) {
      result.availableFields = reportBuilder.getAvailableFields();
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Get custom report queries error:', error);
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
      dataSource, 
      queryType, 
      filters, 
      groupBy, 
      sortBy, 
      limit, 
      customQuery, 
      visualizationType, 
      chartConfig, 
      isActive 
    } = body;

    if (!name || !dataSource || !queryType) {
      return NextResponse.json(
        { error: 'Name, data source, and query type are required' },
        { status: 400 }
      );
    }

    const reportBuilder = new CustomReportBuilder();
    
    // Validate the query
    const validation = reportBuilder.validateCustomReportQuery(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid query configuration', details: validation.errors },
        { status: 400 }
      );
    }

    const query = await reportBuilder.createCustomReportQuery({
      name,
      description: description || '',
      dataSource,
      queryType,
      filters: filters || {},
      groupBy: groupBy || [],
      sortBy: sortBy || [],
      limit: limit || 1000,
      customQuery,
      visualizationType,
      chartConfig,
      isActive: isActive !== false,
      createdBy: session.user.id
    });

    return NextResponse.json({ query }, { status: 201 });

  } catch (error) {
    console.error('Create custom report query error:', error);
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
        { error: 'Query ID is required' },
        { status: 400 }
      );
    }

    const reportBuilder = new CustomReportBuilder();
    
    // Validate the updates if they include query configuration
    if (updates.dataSource || updates.queryType || updates.customQuery || updates.visualizationType) {
      const validation = reportBuilder.validateCustomReportQuery(updates);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: 'Invalid query configuration', details: validation.errors },
          { status: 400 }
        );
      }
    }

    const query = await reportBuilder.updateCustomReportQuery(id, updates);

    return NextResponse.json({ query });

  } catch (error) {
    console.error('Update custom report query error:', error);
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
        { error: 'Query ID is required' },
        { status: 400 }
      );
    }

    const reportBuilder = new CustomReportBuilder();
    await reportBuilder.deleteCustomReportQuery(id);

    return NextResponse.json({ message: 'Custom report query deleted successfully' });

  } catch (error) {
    console.error('Delete custom report query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
