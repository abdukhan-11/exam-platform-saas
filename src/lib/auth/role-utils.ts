import { AppRole } from '@/types/auth';

/**
 * Check if a user has a specific role
 * @param userRole The user's role
 * @param requiredRole The role required for access
 * @returns True if the user has the required role or higher
 */
export function hasRole(userRole: AppRole, requiredRole: AppRole): boolean {
  const roleHierarchy: Record<AppRole, number> = {
    [AppRole.STUDENT]: 1,
    [AppRole.COLLEGE_ADMIN]: 2,
    [AppRole.SUPER_ADMIN]: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if a user has any of the required roles
 * @param userRole The user's role
 * @param requiredRoles Array of roles that grant access
 * @returns True if the user has any of the required roles
 */
export function hasAnyRole(userRole: AppRole, requiredRoles: AppRole[]): boolean {
  return requiredRoles.some(role => hasRole(userRole, role));
}

/**
 * Check if a user has all of the required roles
 * @param userRole The user's role
 * @param requiredRoles Array of roles that must all be present
 * @returns True if the user has all of the required roles
 */
export function hasAllRoles(userRole: AppRole, requiredRoles: AppRole[]): boolean {
  return requiredRoles.every(role => hasRole(userRole, role));
}

/**
 * Get the highest role from a list of roles
 * @param roles Array of roles
 * @returns The highest role in the hierarchy
 */
export function getHighestRole(roles: AppRole[]): AppRole {
  const roleHierarchy: Record<AppRole, number> = {
    [AppRole.STUDENT]: 1,
    [AppRole.COLLEGE_ADMIN]: 2,
    [AppRole.SUPER_ADMIN]: 3,
  };

  return roles.reduce((highest, current) => 
    roleHierarchy[current] > roleHierarchy[highest] ? current : highest
  );
}

/**
 * Check if a role is a super admin role
 * @param role The role to check
 * @returns True if the role is a super admin
 */
export function isSuperAdmin(role: AppRole): boolean {
  return role === AppRole.SUPER_ADMIN;
}

/**
 * Check if a role is a college admin role
 * @param role The role to check
 * @returns True if the role is a college admin or higher
 */
export function isCollegeAdmin(role: AppRole): boolean {
  return hasRole(role, AppRole.COLLEGE_ADMIN);
}

/**
 * Check if a role is a teacher role
 * @param role The role to check
 * @returns True if the role is a teacher or higher
 */
// isTeacher removed; teacher privileges are now college admin

/**
 * Check if a role is a student role
 * @param role The role to check
 * @returns True if the role is a student or higher
 */
export function isStudent(role: AppRole): boolean {
  return hasRole(role, AppRole.STUDENT);
}
