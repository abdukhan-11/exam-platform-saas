import { NextRequest, NextResponse } from 'next/server';
import { securityService, SecurityContext } from '@/lib/security/security-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      examId, 
      isExam = false,
      action = 'general' 
    } = body;

    // Get client IP address
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.ip || 
                     'unknown';

    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create security context
    const context: SecurityContext = {
      userId: session.user?.id,
      sessionId: session.sessionId || 'unknown',
      ipAddress,
      userAgent,
      collegeId: session.user?.collegeId,
      role: session.user?.role,
      examId,
      isExam,
    };

    // Perform security assessment
    const assessment = await securityService.assessSecurity(context);

    // Record activity
    securityService.recordActivity(context);

    return NextResponse.json({
      success: true,
      assessment,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Security assessment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || session.sessionId;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Get security status
    const securityStatus = securityService.getSecurityStatus(sessionId);

    return NextResponse.json({
      success: true,
      status: securityStatus,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Security status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
