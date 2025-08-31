import { AppRole } from '@/types/auth';

export interface RolePermission {
  description: string;
  actions: string[];
  restrictions: string;
  dataAccess: string[];
  apiEndpoints: string[];
  uiComponents: string[];
}

export interface RBACConfig {
  [key: string]: RolePermission;
}

export const rbacConfig: RBACConfig = {
  [AppRole.SUPER_ADMIN]: {
    description: 'Full system access and control',
    actions: [
      'Create, read, update, delete colleges',
      'Create, read, update, delete users',
      'Create, read, update, delete subjects',
      'Create, read, update, delete exams',
      'Create, read, update, delete questions',
      'Access all system data',
      'Manage system settings',
      'View all logs and analytics',
      'Manage role assignments',
      'System-wide configuration'
    ],
    restrictions: 'None - Full access to all system features',
    dataAccess: [
      'All colleges',
      'All users',
      'All subjects',
      'All exams',
      'All questions',
      'All results',
      'System logs',
      'Analytics data'
    ],
    apiEndpoints: [
      '/api/colleges/*',
      '/api/users/*',
      '/api/subjects/*',
      '/api/exams/*',
      '/api/questions/*',
      '/api/admin/*',
      '/api/analytics/*'
    ],
    uiComponents: [
      'Super Admin Dashboard',
      'College Management',
      'User Management',
      'System Settings',
      'Error Monitor',
      'Analytics Dashboard'
    ]
  },

  [AppRole.COLLEGE_ADMIN]: {
    description: 'College-level management access',
    actions: [
      'Read college information',
      'Create, read, update, delete teachers',
      'Create, read, update, delete students',
      'Create, read, update, delete subjects within college',
      'Create, read, update, delete exams within college',
      'Create, read, update, delete questions within college',
      'View college-specific data and analytics',
      'Manage college settings',
      'Assign teachers to subjects',
      'Enroll students in subjects'
    ],
    restrictions: 'Limited to their assigned college only',
    dataAccess: [
      'Assigned college information',
      'College teachers',
      'College students',
      'College subjects',
      'College exams',
      'College questions',
      'College results',
      'College analytics'
    ],
    apiEndpoints: [
      '/api/colleges/{collegeId}',
      '/api/users/college/*',
      '/api/subjects/college/*',
      '/api/exams/college/*',
      '/api/questions/college/*',
      '/api/college/*'
    ],
    uiComponents: [
      'College Admin Dashboard',
      'Teacher Management',
      'Student Management',
      'Subject Management',
      'Exam Management',
      'College Analytics'
    ]
  },

  // AppRole.TEACHER removed – capabilities merged into COLLEGE_ADMIN

  [AppRole.STUDENT]: {
    description: 'Personal exam and result access',
    actions: [
      'Read assigned subject information',
      'Take exams for enrolled subjects',
      'View personal exam results',
      'View personal grades and feedback',
      'Update personal profile information',
      'View exam schedules',
      'Access study materials'
    ],
    restrictions: 'Limited to personal data and enrolled subjects only',
    dataAccess: [
      'Enrolled subjects',
      'Personal exam results',
      'Personal grades',
      'Exam schedules',
      'Study materials',
      'Personal profile'
    ],
    apiEndpoints: [
      '/api/subjects/enrolled',
      '/api/exams/available',
      '/api/results/personal',
      '/api/student/*',
      '/api/profile/*'
    ],
    uiComponents: [
      'Student Dashboard',
      'Subject Overview',
      'Exam Center',
      'Results Viewer',
      'Profile Settings',
      'Study Materials'
    ]
  }
};

export function getRolePermissions(role: AppRole): RolePermission {
  return rbacConfig[role] || {
    description: 'Unknown role',
    actions: [],
    restrictions: 'No access granted',
    dataAccess: [],
    apiEndpoints: [],
    uiComponents: []
  };
}

export function hasPermission(userRole: AppRole, requiredRole: AppRole): boolean {
  const roleHierarchy: Record<AppRole, number> = {
    [AppRole.SUPER_ADMIN]: 3,
    [AppRole.COLLEGE_ADMIN]: 2,
    [AppRole.STUDENT]: 1
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function canAccessEndpoint(userRole: AppRole, endpoint: string): boolean {
  const permissions = getRolePermissions(userRole);
  return permissions.apiEndpoints.some(pattern => {
    // Simple pattern matching - can be enhanced with regex
    if (pattern.includes('*')) {
      const basePattern = pattern.replace('*', '');
      return endpoint.startsWith(basePattern);
    }
    return endpoint === pattern;
  });
}

export function canAccessComponent(userRole: AppRole, component: string): boolean {
  const permissions = getRolePermissions(userRole);
  return permissions.uiComponents.includes(component);
}
