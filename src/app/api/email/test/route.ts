import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { getEmailService } from '@/lib/email/email-service';
import { NotificationPreferencesService } from '@/lib/email/notification-preferences';
import { EmailTestingService } from '@/lib/email/email-testing';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin privileges
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !['SUPER_ADMIN', 'COLLEGE_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { testEmail, testType } = body;

    // Initialize services
    const emailService = getEmailService(prisma);
    const preferencesService = new NotificationPreferencesService(prisma);
    const testingService = new EmailTestingService(emailService, preferencesService, prisma);

    let result;

    switch (testType) {
      case 'connection':
        result = await testingService.testEmailConnection();
        break;
      
      case 'sending':
        result = await testingService.testEmailSending(testEmail);
        break;
      
      case 'templates':
        result = await testingService.testEmailTemplates();
        break;
      
      case 'preferences':
        result = await testingService.testNotificationPreferences();
        break;
      
      case 'rate-limiting':
        result = await testingService.testRateLimiting();
        break;
      
      case 'full-suite':
        const testSuite = await testingService.runTestSuite(testEmail);
        const report = testingService.generateTestReport(testSuite);
        
        return NextResponse.json({
          success: true,
          testSuite,
          report,
        });
      
      default:
        return NextResponse.json(
          { error: 'Invalid test type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      details: result.details,
      timestamp: result.timestamp,
    });

  } catch (error) {
    console.error('Email testing error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin privileges
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !['SUPER_ADMIN', 'COLLEGE_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get email statistics
    const emailService = getEmailService(prisma);
    const stats = await emailService.getEmailStats();

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('Email stats error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
