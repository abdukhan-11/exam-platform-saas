'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { UserRole } from '@prisma/client';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

interface User {
  id: string;
  email?: string;
  rollNo?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  college: {
    id: string;
    name: string;
  };
}

interface UseUserManagementOptions {
  collegeId?: string;
  autoFetch?: boolean;
}

export function useUserManagement(options: UseUserManagementOptions = {}) {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { collegeId, autoFetch = true } = options;

  // Permission checks
  const canCreateUser = session?.user && PermissionService.hasPermission(session.user.role, Permission.CREATE_USER);
  const canReadUser = session?.user && PermissionService.hasPermission(session.user.role, Permission.READ_USER);
  const canUpdateUser = session?.user && PermissionService.hasPermission(session.user.role, Permission.UPDATE_USER);
  const canDeleteUser = session?.user && PermissionService.hasPermission(session.user.role, Permission.DELETE_USER);
  const canDeactivateUser = session?.user && PermissionService.hasPermission(session.user.role, Permission.DEACTIVATE_USER);
  const canReactivateUser = session?.user && PermissionService.hasPermission(session.user.role, Permission.REACTIVATE_USER);
  const canInviteUser = session?.user && PermissionService.hasPermission(session.user.role, Permission.INVITE_USER);
  const canBulkImport = session?.user && PermissionService.hasPermission(session.user.role, Permission.BULK_IMPORT_USERS);
  const canExportUsers = session?.user && PermissionService.hasPermission(session.user.role, Permission.EXPORT_USERS);

  const fetchUsers = useCallback(async (params: {
    search?: string;
    role?: UserRole;
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}) => {
    if (!canReadUser) {
      setError('Insufficient permissions to read users');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        page: (params.page || 1).toString(),
        limit: (params.limit || 10).toString(),
      });

      if (collegeId) searchParams.append('collegeId', collegeId);
      if (params.search) searchParams.append('search', params.search);
      if (params.role) searchParams.append('role', params.role);
      if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());

      const response = await fetch(`/api/users?${searchParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [canReadUser, collegeId]);

  const createUser = useCallback(async (userData: {
    email?: string;
    rollNo?: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
    dateOfBirth?: string;
    address?: string;
  }) => {
    if (!canCreateUser) {
      throw new Error('Insufficient permissions to create users');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          collegeId: collegeId || session?.user.collegeId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      const newUser = await response.json();
      
      // Refresh the user list
      if (autoFetch) {
        await fetchUsers();
      }

      return newUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [canCreateUser, collegeId, session?.user.collegeId, autoFetch, fetchUsers]);

  const updateUser = useCallback(async (userId: string, userData: {
    email?: string;
    rollNo?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: string;
    address?: string;
    isActive?: boolean;
  }) => {
    if (!canUpdateUser) {
      throw new Error('Insufficient permissions to update users');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      const updatedUser = await response.json();
      
      // Update the user in the local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? updatedUser : user
      ));

      return updatedUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [canUpdateUser]);

  const deactivateUser = useCallback(async (userId: string) => {
    if (!canDeactivateUser) {
      throw new Error('Insufficient permissions to deactivate users');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}/deactivate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deactivate user');
      }

      const result = await response.json();
      
      // Update the user in the local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isActive: false } : user
      ));

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [canDeactivateUser]);

  const reactivateUser = useCallback(async (userId: string) => {
    if (!canReactivateUser) {
      throw new Error('Insufficient permissions to reactivate users');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}/reactivate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reactivate user');
      }

      const result = await response.json();
      
      // Update the user in the local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isActive: true } : user
      ));

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reactivate user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [canReactivateUser]);

  const inviteUser = useCallback(async (invitationData: {
    email: string;
    role: UserRole;
    message?: string;
  }) => {
    if (!canInviteUser) {
      throw new Error('Insufficient permissions to invite users');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...invitationData,
          collegeId: collegeId || session?.user.collegeId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invitation');
      }

      const invitation = await response.json();
      return invitation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [canInviteUser, collegeId, session?.user.collegeId]);

  const bulkImportUsers = useCallback(async (users: Array<{
    email?: string;
    rollNo?: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
    dateOfBirth?: string;
    address?: string;
  }>) => {
    if (!canBulkImport) {
      throw new Error('Insufficient permissions to bulk import users');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          users,
          collegeId: collegeId || session?.user.collegeId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import users');
      }

      const result = await response.json();
      
      // Refresh the user list if there were successful imports
      if (result.success > 0 && autoFetch) {
        await fetchUsers();
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import users';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [canBulkImport, collegeId, session?.user.collegeId, autoFetch, fetchUsers]);

  const getUserActivityLogs = useCallback(async (params: {
    userId?: string;
    action?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    if (!session?.user || !PermissionService.hasPermission(session.user.role, Permission.VIEW_AUDIT_LOGS)) {
      throw new Error('Insufficient permissions to view activity logs');
    }

    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        page: (params.page || 1).toString(),
        limit: (params.limit || 50).toString(),
      });

      if (params.userId) searchParams.append('userId', params.userId);
      if (params.action) searchParams.append('action', params.action);

      const response = await fetch(`/api/users/activity-logs?${searchParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activity logs';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  return {
    // State
    users,
    loading,
    error,
    
    // Permissions
    canCreateUser,
    canReadUser,
    canUpdateUser,
    canDeleteUser,
    canDeactivateUser,
    canReactivateUser,
    canInviteUser,
    canBulkImport,
    canExportUsers,
    
    // Actions
    fetchUsers,
    createUser,
    updateUser,
    deactivateUser,
    reactivateUser,
    inviteUser,
    bulkImportUsers,
    getUserActivityLogs,
    
    // Utilities
    setError,
    clearError: () => setError(null),
  };
}
