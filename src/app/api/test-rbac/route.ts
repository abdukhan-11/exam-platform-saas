import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { hasAnyRole } from '@/lib/auth/utils';
import { AppRole } from '@/types/auth';
import { apiResponse } from '@/lib/api-response';
import { errorLogger } from '@/lib/error-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return apiResponse.unauthorized('No session found');
    }

    // Access the role from the session user
    const userRole = (session.user as any)?.role as AppRole;
    
    if (!userRole) {
      return apiResponse.unauthorized('No role found in session');
    }

    // Test different role-based access
    const testResults = {
      userRole,
      timestamp: new Date().toISOString(),
      tests: {
        superAdminAccess: hasAnyRole(userRole, [AppRole.SUPER_ADMIN]),
        collegeAdminAccess: hasAnyRole(userRole, [AppRole.COLLEGE_ADMIN, AppRole.SUPER_ADMIN]),
        teacherAccess: hasAnyRole(userRole, [AppRole.TEACHER, AppRole.COLLEGE_ADMIN, AppRole.SUPER_ADMIN]),
        studentAccess: hasAnyRole(userRole, [AppRole.STUDENT, AppRole.TEACHER, AppRole.COLLEGE_ADMIN, AppRole.SUPER_ADMIN]),
      },
      permissions: getRolePermissions(userRole),
      message: 'RBAC test completed successfully'
    };

    errorLogger.logInfo('RBAC test executed', {
      userRole,
      endpoint: '/api/test-rbac',
      method: 'GET'
    });

    return apiResponse.success('RBAC test completed', testResults);
  } catch (error) {
    errorLogger.logError('RBAC test failed', error, request);
    return apiResponse.error('RBAC test failed', 500, error instanceof Error ? error.message : 'Unknown error', request);
  }
}

function getRolePermissions(role: AppRole) {
  const permissions = {
    [AppRole.SUPER_ADMIN]: {
      description: 'Full system access and control',
      actions: [
        'Create, read, update, delete colleges',
        'Create, read, update, delete users',
        'Create, read, update, delete subjects',
        'Create, read, update, delete exams',
        'Access all system data',
        'Manage system settings',
        'View all logs and analytics'
      ],
      restrictions: 'None',
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
        'View college-specific data and analytics'
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
    [AppRole.TEACHER]: {
      description: 'Subject and exam management access',
      actions: [
        'Read assigned subject information',
        'Create, read, update, delete exams for assigned subjects',
        'Create, read, update, delete questions for assigned subjects',
        'View student results for assigned subjects',
        'Update student grades and feedback'
      ],
      restrictions: 'Limited to assigned subjects and students only',
      dataAccess: [
        'Assigned subjects',
        'Subject exams',
        'Subject questions',
        'Enrolled students',
        'Student results',
        'Exam analytics'
      ],
      apiEndpoints: [
        '/api/subjects/{subjectId}',
        '/api/exams/subject/*',
        '/api/questions/subject/*',
        '/api/results/subject/*',
        '/api/teacher/*'
      ],
      uiComponents: [
        'Teacher Dashboard',
        'Subject Overview',
        'Exam Creator',
        'Question Manager',
        'Student Results',
        'Exam Analytics'
      ]
    },
    [AppRole.STUDENT]: {
      description: 'Personal exam and result access',
      actions: [
        'Read assigned subject information',
        'Take exams for enrolled subjects',
        'View personal exam results',
        'View personal grades and feedback',
        'Update personal profile information'
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

  return permissions[role] || {
    description: 'Unknown role',
    actions: [],
    restrictions: 'No access granted',
    dataAccess: [],
    apiEndpoints: [],
    uiComponents: []
  };
}
