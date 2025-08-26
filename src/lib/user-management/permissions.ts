import { UserRole } from '@prisma/client';

export enum Permission {
  // User Management
  CREATE_USER = 'user:create',
  READ_USER = 'user:read',
  VIEW_USERS = 'user:view',
  UPDATE_USER = 'user:update',
  DELETE_USER = 'user:delete',
  DEACTIVATE_USER = 'user:deactivate',
  REACTIVATE_USER = 'user:reactivate',
  INVITE_USER = 'user:invite',
  BULK_IMPORT_USERS = 'user:bulk_import',
  EXPORT_USERS = 'user:export',
  
  // College Management
  CREATE_COLLEGE = 'college:create',
  READ_COLLEGE = 'college:read',
  UPDATE_COLLEGE = 'college:update',
  DELETE_COLLEGE = 'college:delete',
  
  // Class Management
  CREATE_CLASS = 'class:create',
  READ_CLASS = 'class:read',
  UPDATE_CLASS = 'class:update',
  DELETE_CLASS = 'class:delete',
  
  // Subject Management
  CREATE_SUBJECT = 'subject:create',
  READ_SUBJECT = 'subject:read',
  UPDATE_SUBJECT = 'subject:update',
  DELETE_SUBJECT = 'subject:delete',
  
  // Exam Management
  CREATE_EXAM = 'exam:create',
  READ_EXAM = 'exam:read',
  UPDATE_EXAM = 'exam:update',
  DELETE_EXAM = 'exam:delete',
  SCHEDULE_EXAM = 'exam:schedule',
  CONDUCT_EXAM = 'exam:conduct',
  GRADE_EXAM = 'exam:grade',
  
  // Question Management
  CREATE_QUESTION = 'question:create',
  READ_QUESTION = 'question:read',
  UPDATE_QUESTION = 'question:update',
  DELETE_QUESTION = 'question:delete',
  
  // Results Management
  READ_RESULTS = 'results:read',
  UPDATE_RESULTS = 'results:update',
  EXPORT_RESULTS = 'results:export',
  
  // Analytics and Reports
  READ_ANALYTICS = 'analytics:read',
  READ_REPORTS = 'reports:read',
  EXPORT_REPORTS = 'reports:export',
  
  // System Administration
  MANAGE_SYSTEM_SETTINGS = 'system:settings',
  VIEW_AUDIT_LOGS = 'system:audit_logs',
  MANAGE_SECURITY = 'system:security',
  BACKUP_DATA = 'system:backup',
  RESTORE_DATA = 'system:restore',
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  restrictions?: {
    collegeScope?: boolean; // Can only access their own college
    readOnly?: boolean; // Can only read, not modify
    limitedAccess?: string[]; // Limited to specific resources
  };
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [UserRole.SUPER_ADMIN]: {
    role: UserRole.SUPER_ADMIN,
    permissions: Object.values(Permission),
    restrictions: {
      collegeScope: false, // Can access all colleges
    },
  },
  
  [UserRole.COLLEGE_ADMIN]: {
    role: UserRole.COLLEGE_ADMIN,
    permissions: [
      // User Management (within their college)
      Permission.CREATE_USER,
      Permission.READ_USER,
      Permission.VIEW_USERS,
      Permission.UPDATE_USER,
      Permission.DEACTIVATE_USER,
      Permission.REACTIVATE_USER,
      Permission.INVITE_USER,
      Permission.BULK_IMPORT_USERS,
      Permission.EXPORT_USERS,
      
      // College Management (their own college only)
      Permission.READ_COLLEGE,
      Permission.UPDATE_COLLEGE,
      
      // Class Management
      Permission.CREATE_CLASS,
      Permission.READ_CLASS,
      Permission.UPDATE_CLASS,
      Permission.DELETE_CLASS,
      
      // Subject Management
      Permission.CREATE_SUBJECT,
      Permission.READ_SUBJECT,
      Permission.UPDATE_SUBJECT,
      Permission.DELETE_SUBJECT,
      
      // Exam Management
      Permission.CREATE_EXAM,
      Permission.READ_EXAM,
      Permission.UPDATE_EXAM,
      Permission.DELETE_EXAM,
      Permission.SCHEDULE_EXAM,
      Permission.CONDUCT_EXAM,
      Permission.GRADE_EXAM,
      
      // Question Management
      Permission.CREATE_QUESTION,
      Permission.READ_QUESTION,
      Permission.UPDATE_QUESTION,
      Permission.DELETE_QUESTION,
      
      // Results Management
      Permission.READ_RESULTS,
      Permission.UPDATE_RESULTS,
      Permission.EXPORT_RESULTS,
      
      // Analytics and Reports
      Permission.READ_ANALYTICS,
      Permission.READ_REPORTS,
      Permission.EXPORT_REPORTS,
      
      // System Administration (limited)
      Permission.VIEW_AUDIT_LOGS,
    ],
    restrictions: {
      collegeScope: true, // Can only access their own college
    },
  },
  
  [UserRole.TEACHER]: {
    role: UserRole.TEACHER,
    permissions: [
      // User Management (limited - can view students)
      Permission.READ_USER,
      Permission.VIEW_USERS,
      
      // Class Management (classes they teach)
      Permission.READ_CLASS,
      
      // Subject Management (subjects they teach)
      Permission.READ_SUBJECT,
      
      // Exam Management (exams they create/conduct)
      Permission.CREATE_EXAM,
      Permission.READ_EXAM,
      Permission.UPDATE_EXAM,
      Permission.SCHEDULE_EXAM,
      Permission.CONDUCT_EXAM,
      Permission.GRADE_EXAM,
      
      // Question Management
      Permission.CREATE_QUESTION,
      Permission.READ_QUESTION,
      Permission.UPDATE_QUESTION,
      Permission.DELETE_QUESTION,
      
      // Results Management
      Permission.READ_RESULTS,
      Permission.UPDATE_RESULTS,
      Permission.EXPORT_RESULTS,
      
      // Analytics and Reports (limited)
      Permission.READ_ANALYTICS,
      Permission.READ_REPORTS,
    ],
    restrictions: {
      collegeScope: true,
      limitedAccess: ['own_classes', 'own_subjects', 'own_exams'],
    },
  },
  
  [UserRole.STUDENT]: {
    role: UserRole.STUDENT,
    permissions: [
      // User Management (own profile only)
      Permission.READ_USER,
      Permission.VIEW_USERS,
      Permission.UPDATE_USER,
      
      // Class Management (classes they're enrolled in)
      Permission.READ_CLASS,
      
      // Subject Management (subjects they study)
      Permission.READ_SUBJECT,
      
      // Exam Management (exams they can take)
      Permission.READ_EXAM,
      Permission.CONDUCT_EXAM,
      
      // Results Management (own results only)
      Permission.READ_RESULTS,
    ],
    restrictions: {
      collegeScope: true,
      readOnly: true, // Mostly read-only access
      limitedAccess: ['own_profile', 'own_classes', 'own_exams', 'own_results'],
    },
  },
};

export class PermissionService {
  /**
   * Check if a user has a specific permission
   */
  static hasPermission(userRole: UserRole, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole];
    return rolePermissions.permissions.includes(permission);
  }

  /**
   * Check if a user has any of the specified permissions
   */
  static hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Check if a user has all of the specified permissions
   */
  static hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Get all permissions for a role
   */
  static getRolePermissions(userRole: UserRole): Permission[] {
    return ROLE_PERMISSIONS[userRole].permissions;
  }

  /**
   * Get role restrictions
   */
  static getRoleRestrictions(userRole: UserRole): RolePermissions['restrictions'] {
    return ROLE_PERMISSIONS[userRole].restrictions;
  }

  /**
   * Check if user can access a specific college
   */
  static canAccessCollege(
    userRole: UserRole,
    userCollegeId: string,
    targetCollegeId: string
  ): boolean {
    const restrictions = this.getRoleRestrictions(userRole);
    
    // Super admin can access all colleges
    if (!restrictions?.collegeScope) {
      return true;
    }
    
    // Other roles can only access their own college
    return userCollegeId === targetCollegeId;
  }

  /**
   * Check if user can perform action on a resource
   */
  static canPerformAction(
    userRole: UserRole,
    userCollegeId: string,
    action: Permission,
    resourceCollegeId?: string,
    resourceOwnerId?: string,
    userId?: string
  ): boolean {
    // Check basic permission
    if (!this.hasPermission(userRole, action)) {
      return false;
    }

    // Check college scope
    if (resourceCollegeId && !this.canAccessCollege(userRole, userCollegeId, resourceCollegeId)) {
      return false;
    }

    // Check resource ownership for limited access roles
    const restrictions = this.getRoleRestrictions(userRole);
    if (restrictions?.limitedAccess && resourceOwnerId && userId) {
      // For limited access roles, check if user owns the resource
      if (restrictions.limitedAccess.includes('own_profile') && resourceOwnerId !== userId) {
        return false;
      }
    }

    return true;
  }

  /**
   * Filter resources based on user permissions
   */
  static filterResourcesByPermission<T extends { collegeId: string; createdBy?: string }>(
    userRole: UserRole,
    userCollegeId: string,
    resources: T[],
    permission: Permission
  ): T[] {
    return resources.filter(resource => {
      return this.canPerformAction(
        userRole,
        userCollegeId,
        permission,
        resource.collegeId,
        resource.createdBy
      );
    });
  }

  /**
   * Get user's accessible colleges
   */
  static getAccessibleColleges(userRole: UserRole, userCollegeId: string): string[] {
    const restrictions = this.getRoleRestrictions(userRole);
    
    if (!restrictions?.collegeScope) {
      // Super admin can access all colleges
      return ['*']; // Special marker for all colleges
    }
    
    // Other roles can only access their own college
    return [userCollegeId];
  }

  /**
   * Validate user action with comprehensive checks
   */
  static validateUserAction(params: {
    userRole: UserRole;
    userCollegeId: string;
    userId: string;
    action: Permission;
    resource?: {
      collegeId?: string;
      ownerId?: string;
      type?: string;
    };
  }): {
    allowed: boolean;
    reason?: string;
  } {
    const { userRole, userCollegeId, userId, action, resource } = params;

    // Check basic permission
    if (!this.hasPermission(userRole, action)) {
      return {
        allowed: false,
        reason: `Role ${userRole} does not have permission ${action}`,
      };
    }

    // Check college scope
    if (resource?.collegeId && !this.canAccessCollege(userRole, userCollegeId, resource.collegeId)) {
      return {
        allowed: false,
        reason: `Cannot access resources from college ${resource.collegeId}`,
      };
    }

    // Check resource ownership
    const restrictions = this.getRoleRestrictions(userRole);
    if (restrictions?.limitedAccess && resource?.ownerId && resource.ownerId !== userId) {
      return {
        allowed: false,
        reason: `Cannot access resources owned by other users`,
      };
    }

    return { allowed: true };
  }
}

export default PermissionService;
