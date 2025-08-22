import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { AppRole } from '@/types/auth';
import { verifyAccessToken } from '@/lib/auth/token-service';
import { env } from '@/lib/env';

export function hasRole(user: { role?: AppRole } | undefined, requiredRoles: AppRole[]): boolean {
  if (!user || !user.role) {
    return false;
  }
  return requiredRoles.includes(user.role);
}

export function withRole(handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>, requiredRoles: AppRole[]) {
  return async (req: NextRequest, ...args: unknown[]) => {
    try {
      // Try NextAuth token first
      let token = await getToken({ req, secret: env.NEXTAUTH_SECRET });
      let role: AppRole | undefined = token?.role as AppRole | undefined;

      // Fallback to Authorization header for direct API access
      if (!role) {
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const rawToken = authHeader.slice('Bearer '.length).trim();
          const decoded = verifyAccessToken(rawToken);
          if (decoded && typeof decoded === 'object' && 'role' in decoded) {
            role = decoded.role as AppRole;
            // Create a mock token object for the handler
            token = {
              id: decoded.id,
              role: decoded.role,
              collegeId: decoded.collegeId,
                         } as { id: string; role: AppRole; collegeId?: string };
          }
        }
      }

      if (!role) {
        return NextResponse.json({ 
          error: 'Unauthorized - No valid token found',
          code: 'NO_TOKEN'
        }, { status: 401 });
      }

      if (!hasRole({ role }, requiredRoles)) {
        console.warn(`Access denied: User with role ${role} attempted to access route requiring roles: ${requiredRoles.join(', ')}`);
        return NextResponse.json({ 
          error: 'Forbidden - Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: requiredRoles,
          current: role
        }, { status: 403 });
      }

      return handler(req, ...args);
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return NextResponse.json({ 
        error: 'Internal server error in RBAC middleware',
        code: 'RBAC_ERROR'
      }, { status: 500 });
    }
  };
}

export async function guardRole(
  req: NextRequest,
  allowed: AppRole[]
): Promise<NextResponse | null> {
  try {
    // Try NextAuth token first
    const token = await getToken({ req });
    let role: AppRole | undefined = token?.role as AppRole | undefined;

    // Fallback to Authorization: Bearer <accessToken> issued by our token-service
    if (!role) {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const raw = authHeader.slice('Bearer '.length).trim();
        const decoded = verifyAccessToken(raw);
        if (decoded && typeof decoded === 'object' && 'role' in decoded) {
          role = decoded.role as AppRole;
        }
      }
    }

    if (!role) {
      return NextResponse.json({ 
        error: 'Unauthorized - No valid authentication found',
        code: 'NO_AUTH'
      }, { status: 401 });
    }

    if (!allowed.includes(role)) {
      console.warn(`Access denied: User with role ${role} attempted to access route requiring roles: ${allowed.join(', ')}`);
      return NextResponse.json({ 
        error: 'Forbidden - Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowed,
        current: role
      }, { status: 403 });
    }

    return null;
  } catch (error) {
    console.error('Role guard error:', error);
    return NextResponse.json({ 
      error: 'Internal server error in role guard',
      code: 'ROLE_GUARD_ERROR'
    }, { status: 500 });
  }
}

export function requireRole(requiredRoles: AppRole[]) {
  return function(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: unknown[]) {
      const req = args[0];
      if (req instanceof NextRequest) {
        const guardResult = await guardRole(req, requiredRoles);
        if (guardResult) {
          return guardResult;
        }
      }
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

export async function guardSuperAdmin(req: NextRequest) {
  return guardRole(req, ['SUPER_ADMIN']);
}

export async function guardCollegeAdmin(req: NextRequest) {
  return guardRole(req, ['COLLEGE_ADMIN', 'SUPER_ADMIN']);
}

export async function guardTeacher(req: NextRequest) {
  return guardRole(req, ['TEACHER', 'COLLEGE_ADMIN', 'SUPER_ADMIN']);
}

export async function guardStudent(req: NextRequest) {
  return guardRole(req, ['STUDENT', 'COLLEGE_ADMIN', 'SUPER_ADMIN']);
}


