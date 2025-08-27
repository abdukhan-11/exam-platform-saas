import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { AppRole } from '@/types/auth';
import { verifyAccessToken } from '@/lib/auth/token-service';
import { auditLogger } from '@/lib/security/audit-logger';
import { securityService } from '@/lib/security/security-service';
import { env } from '@/lib/env';

export interface SuperAdminContext {
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
  action: string;
  resource: string;
}

export function withSuperAdmin(
  handler: (req: NextRequest, context: SuperAdminContext, ...args: unknown[]) => Promise<NextResponse>,
  requiredPermissions: string[] = []
) {
  return async (req: NextRequest, ...args: unknown[]) => {
    try {
      const startTime = Date.now();
      
      // Get client IP address
      const ipAddress = req.headers.get('x-forwarded-for') || 
                       req.headers.get('x-real-ip') || 
                       req.ip || 
                       'unknown';

      // Get user agent
      const userAgent = req.headers.get('user-agent') || 'unknown';

      // Try NextAuth token first
      let token = await getToken({ req, secret: env.NEXTAUTH_SECRET });
      let role: AppRole | undefined = token?.role as AppRole | undefined;
      let userId: string | undefined = token?.id as string | undefined;

      // Fallback to Authorization header for direct API access
      if (!role || !userId) {
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const rawToken = authHeader.slice('Bearer '.length).trim();
          const decoded = verifyAccessToken(rawToken);
          if (decoded && typeof decoded === 'object' && 'role' in decoded && 'id' in decoded) {
            role = decoded.role as AppRole;
            userId = decoded.id as string;
            // Create a mock token object for the handler
            token = {
              id: decoded.id,
              role: decoded.role,
              collegeId: decoded.collegeId,
            } as { id: string; role: AppRole; collegeId?: string };
          }
        }
      }

      // Check if user is authenticated
      if (!role || !userId) {
        auditLogger.log({
          level: 'warn',
          category: 'authorization',
          event: 'super_admin_access_denied_no_token',
          userId: 'unknown',
          ipAddress,
          userAgent,
          details: { 
            path: req.nextUrl.pathname,
            method: req.method,
            reason: 'No valid token found'
          }
        });

        return NextResponse.json({ 
          error: 'Unauthorized - No valid token found',
          code: 'NO_TOKEN'
        }, { status: 401 });
      }

      // Check if user has SUPER_ADMIN role
      if (role !== 'SUPER_ADMIN') {
        auditLogger.log({
          level: 'warn',
          category: 'authorization',
          event: 'super_admin_access_denied_insufficient_role',
          userId,
          ipAddress,
          userAgent,
          details: { 
            path: req.nextUrl.pathname,
            method: req.method,
            requiredRole: 'SUPER_ADMIN',
            currentRole: role,
            reason: 'Insufficient role permissions'
          }
        });

        return NextResponse.json({ 
          error: 'Forbidden - Super admin access required',
          code: 'INSUFFICIENT_ROLE',
          required: 'SUPER_ADMIN',
          current: role
        }, { status: 403 });
      }

      // Perform security assessment
      const securityContext = {
        userId,
        sessionId: token.sessionId || 'unknown',
        ipAddress,
        userAgent,
        collegeId: token.collegeId,
        role,
        examId: undefined,
        isExam: false
      };

      const securityAssessment = await securityService.assessSecurity(securityContext);
      
      // Check if security assessment indicates high risk
      if (securityAssessment.overallRisk === 'critical' || securityAssessment.overallRisk === 'high') {
        auditLogger.log({
          level: 'error',
          category: 'security',
          event: 'super_admin_access_denied_high_risk',
          userId,
          ipAddress,
          userAgent,
          details: { 
            path: req.nextUrl.pathname,
            method: req.method,
            riskLevel: securityAssessment.overallRisk,
            riskScore: securityAssessment.riskScore,
            factors: securityAssessment.factors
          }
        });

        return NextResponse.json({ 
          error: 'Access denied - High security risk detected',
          code: 'HIGH_SECURITY_RISK',
          assessment: securityAssessment
        }, { status: 403 });
      }

      // Create super admin context
      const context: SuperAdminContext = {
        userId,
        sessionId: token.sessionId || 'unknown',
        ipAddress,
        userAgent,
        timestamp: Date.now(),
        action: req.method,
        resource: req.nextUrl.pathname
      };

      // Log successful access
      auditLogger.log({
        level: 'info',
        category: 'authorization',
        event: 'super_admin_access_granted',
        userId,
        ipAddress,
        userAgent,
        details: { 
          path: req.nextUrl.pathname,
          method: req.method,
          securityAssessment: {
            riskLevel: securityAssessment.overallRisk,
            riskScore: securityAssessment.riskScore
          }
        }
      });

      // Record activity for security monitoring
      securityService.recordActivity(securityContext);

      // Call the handler with the context
      const response = await handler(req, context, ...args);
      
      // Log completion
      const duration = Date.now() - startTime;
      auditLogger.log({
        level: 'info',
        category: 'authorization',
        event: 'super_admin_action_completed',
        userId,
        ipAddress,
        userAgent,
        details: { 
          path: req.nextUrl.pathname,
          method: req.method,
          duration,
          statusCode: response.status
        }
      });

      return response;

    } catch (error) {
      console.error('Super admin guard error:', error);
      
      // Log the error
      auditLogger.log({
        level: 'error',
        category: 'authorization',
        event: 'super_admin_guard_error',
        userId: 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || req.ip || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        details: { 
          path: req.nextUrl.pathname,
          method: req.method,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      return NextResponse.json({ 
        error: 'Internal server error in super admin guard',
        code: 'SUPER_ADMIN_GUARD_ERROR'
      }, { status: 500 });
    }
  };
}

export function requireSuperAdmin(handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>) {
  return withSuperAdmin(handler);
}

export function requireSuperAdminWithPermissions(permissions: string[]) {
  return (handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>) => {
    return withSuperAdmin(handler, permissions);
  };
}
