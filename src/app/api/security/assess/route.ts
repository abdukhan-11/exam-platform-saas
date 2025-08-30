import { NextRequest, NextResponse } from 'next/server';
import { securityService, SecurityContext } from '@/lib/security/security-service';
import { examSecurityService } from '@/lib/security/exam-security';
import { auditLogger } from '@/lib/security/audit-logger';
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
      action = 'general',
      config: examConfig,
      details = {},
    } = body;

    // Get client IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = (forwardedFor ? forwardedFor.split(',')[0]?.trim() : null) ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Derive a stable session identifier (cookie token if available, else fallback to user-based)
    const cookieSessionToken = request.cookies.get('next-auth.session-token')?.value 
      || request.cookies.get('__Secure-next-auth.session-token')?.value 
      || undefined;
    const derivedSessionId = cookieSessionToken || (session.user?.id ? `session_${session.user.id}` : 'unknown');

    // Create security context
    const context: SecurityContext = {
      userId: session.user?.id,
      sessionId: derivedSessionId,
      ipAddress,
      userAgent,
      collegeId: session.user?.collegeId ?? undefined,
      role: session.user?.role,
      examId,
      isExam,
    };

    // Ensure exam security is initialized when applicable
    if (isExam && examId && session.user?.id && derivedSessionId) {
      if (!examSecurityService.isExamActive(examId, session.user.id, derivedSessionId)) {
        await securityService.startExamSecurity(
          examId,
          session.user.id,
          derivedSessionId,
          examConfig || {}
        );
      }
    }

    // Handle explicit actions for real-time monitoring/cheating detection
    if (isExam && examId && session.user?.id && derivedSessionId) {
      const commonEvent = {
        examId,
        userId: session.user.id,
        sessionId: derivedSessionId,
      } as const;

      switch (action) {
        case 'start_exam': {
          // Already ensured above; log start event
          auditLogger.logExamSecurity('exam_started', {
            ...commonEvent,
            severity: 'low',
            description: 'Exam monitoring started',
            metadata: { config: examConfig },
          });
          break;
        }
        case 'tab_switch': {
          examSecurityService.recordEvent({
            ...commonEvent,
            eventType: 'tab_switch',
            severity: 'high',
            details: { reason: 'tab_switch', ...details },
            action: 'warn',
          });
          auditLogger.logExamSecurity('tab_switch', {
            ...commonEvent,
            severity: 'high',
            description: 'Tab switch detected during exam',
            metadata: details,
          });
          break;
        }
        case 'window_blur': {
          examSecurityService.recordEvent({
            ...commonEvent,
            eventType: 'window_blur',
            severity: 'medium',
            details: { reason: 'window_blur', ...details },
            action: 'log',
          });
          break;
        }
        case 'fullscreen_exit': {
          examSecurityService.recordEvent({
            ...commonEvent,
            eventType: 'fullscreen_exit',
            severity: 'high',
            details: { reason: 'fullscreen_exit', ...details },
            action: 'warn',
          });
          break;
        }
        case 'fullscreen_enter': {
          // Treat as heartbeat/update for status insights
          examSecurityService.recordEvent({
            ...commonEvent,
            eventType: 'heartbeat',
            severity: 'low',
            details: { state: 'fullscreen_enter', ...details },
            action: 'log',
          });
          break;
        }
        case 'copy_paste_blocked': {
          examSecurityService.recordEvent({
            ...commonEvent,
            eventType: 'copy_paste',
            severity: 'medium',
            details: { action: 'copy_or_paste', ...details },
            action: 'block',
          });
          auditLogger.logExamSecurity('copy_paste', {
            ...commonEvent,
            severity: 'medium',
            description: 'Copy/Paste attempt blocked',
            metadata: details,
          });
          break;
        }
        case 'right_click_blocked': {
          examSecurityService.recordEvent({
            ...commonEvent,
            eventType: 'right_click',
            severity: 'low',
            details: { ...details },
            action: 'block',
          });
          break;
        }
        case 'dev_tools': {
          examSecurityService.recordEvent({
            ...commonEvent,
            eventType: 'dev_tools',
            severity: 'high',
            details: { reason: 'dev_tools_opened', ...details },
            action: 'warn',
          });
          break;
        }
        case 'heartbeat':
        case 'activity': {
          examSecurityService.recordEvent({
            ...commonEvent,
            eventType: 'heartbeat',
            severity: 'low',
            details: { ...details },
            action: 'log',
          });
          break;
        }
      }
    }

    // Perform security assessment and record generic activity
    const assessment = await securityService.assessSecurity(context);
    securityService.recordActivity(context);

    // If exam context, include current status for real-time UI updates
    let status: any = null;
    if (isExam && examId && session.user?.id && derivedSessionId) {
      status = examSecurityService.getSecurityStatus(examId, session.user.id, derivedSessionId);
    }

    return NextResponse.json({
      success: true,
      assessment,
      status,
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
    const cookieSessionToken = request.cookies.get('next-auth.session-token')?.value 
      || request.cookies.get('__Secure-next-auth.session-token')?.value 
      || undefined;
    const sessionId = searchParams.get('sessionId') || cookieSessionToken || (session.user?.id ? `session_${session.user.id}` : '');

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
