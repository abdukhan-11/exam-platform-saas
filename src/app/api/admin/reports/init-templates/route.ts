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
    
    // Initialize system templates
    await reportService.initializeSystemTemplates();

    // Get the created templates
    const templates = await reportService.getSystemReportTemplates();

    return NextResponse.json({ 
      message: 'System report templates initialized successfully',
      templates 
    });

  } catch (error) {
    console.error('Initialize system templates error:', error);
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
    
    // Get system templates
    const templates = await reportService.getSystemReportTemplates();

    return NextResponse.json({ 
      templates,
      count: templates.length,
      isInitialized: templates.length > 0
    });

  } catch (error) {
    console.error('Get system templates status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
