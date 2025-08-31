import { UserRole } from '@prisma/client';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { AppRole } from '@/types/auth';

/**
 * Extracts the JWT token from the request
 */
export async function getTokenFromRequest(req: NextRequest) {
  return await getToken({ req });
}

/**
 * Checks if the user has the required role
 */
export function hasRole(userRole: AppRole, requiredRole: AppRole): boolean {
  const roleHierarchy: Record<AppRole, number> = {
    SUPER_ADMIN: 5,
    COLLEGE_ADMIN: 3,
    
    STUDENT: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Checks if the user has one of the required roles
 */
export function hasAnyRole(userRole: AppRole, requiredRoles: AppRole[]): boolean {
  return requiredRoles.some(role => hasRole(userRole, role));
}

/**
 * Formats an authentication error
 */
export function formatAuthError(status: number, message: string) {
  return {
    status,
    message,
  };
}

/**
 * Gets the role name in a human-readable format
 */
export function getRoleName(role: AppRole): string {
  const roleNames: Record<AppRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    COLLEGE_ADMIN: 'College Admin',
    
    STUDENT: 'Student',
  };

  return roleNames[role] || 'Unknown Role';
}
