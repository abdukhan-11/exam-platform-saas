'use client';

import { useSession } from 'next-auth/react';
import { useCallback } from 'react';

interface LogActivityParams {
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
}

export function useActivityLogger() {
  const { data: session } = useSession();

  const logActivity = useCallback(async (params: LogActivityParams) => {
    if (!session?.user) {
      console.warn('Cannot log activity: User not authenticated');
      return;
    }

    try {
      const response = await fetch('/api/users/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        console.error('Failed to log activity:', await response.text());
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, [session]);

  const logUserAction = useCallback((action: string, resourceType: string, resourceId?: string, details?: Record<string, any>) => {
    logActivity({ action, resourceType, resourceId, details });
  }, [logActivity]);

  const logPageView = useCallback((page: string, details?: Record<string, any>) => {
    logActivity({
      action: 'VIEW',
      resourceType: 'PAGE',
      resourceId: page,
      details,
    });
  }, [logActivity]);

  const logResourceAction = useCallback((
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW',
    resourceType: string,
    resourceId?: string,
    details?: Record<string, any>
  ) => {
    logActivity({ action, resourceType, resourceId, details });
  }, [logActivity]);

  const logAuthentication = useCallback((action: 'LOGIN' | 'LOGOUT' | 'PASSWORD_RESET', details?: Record<string, any>) => {
    logActivity({
      action,
      resourceType: 'AUTH',
      details,
    });
  }, [logActivity]);

  const logExamAction = useCallback((
    action: 'START' | 'SUBMIT' | 'PAUSE' | 'RESUME' | 'TERMINATE',
    examId: string,
    details?: Record<string, any>
  ) => {
    logActivity({
      action,
      resourceType: 'EXAM',
      resourceId: examId,
      details,
    });
  }, [logActivity]);

  const logSecurityEvent = useCallback((
    action: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details?: Record<string, any>
  ) => {
    logActivity({
      action,
      resourceType: 'SECURITY',
      details: {
        severity,
        ...details,
      },
    });
  }, [logActivity]);

  return {
    logActivity,
    logUserAction,
    logPageView,
    logResourceAction,
    logAuthentication,
    logExamAction,
    logSecurityEvent,
  };
}
