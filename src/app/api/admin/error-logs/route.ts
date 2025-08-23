import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { hasAnyRole } from '@/lib/auth/utils';
import { AppRole } from '@/types/auth';
import { apiResponse } from '@/lib/api-response';
import { errorLogger } from '@/lib/error-logger';

// GET /api/admin/error-logs - Get error logs and statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has super admin role
    if (!session || !hasAnyRole(session, [AppRole.SUPER_ADMIN])) {
      return apiResponse.unauthorized('Access denied. Super admin privileges required.', request);
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') as 'error' | 'warn' | 'info' | undefined;
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get logs and statistics
    const logs = errorLogger.getLogs(level, limit);
    const stats = errorLogger.getErrorStats();

    return apiResponse.success('Error logs retrieved successfully', {
      logs,
      stats,
      filters: {
        level: level || 'all',
        limit,
      },
    }, undefined, {
      endpoint: request.nextUrl?.pathname,
      method: request.method,
      requestId: request.headers.get('x-request-id') || undefined,
    });

  } catch (error) {
    return apiResponse.error('Failed to retrieve error logs', 500, error instanceof Error ? error.message : 'Unknown error', request);
  }
}

// DELETE /api/admin/error-logs - Clear all error logs
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has super admin role
    if (!session || !hasAnyRole(session, [AppRole.SUPER_ADMIN])) {
      return apiResponse.unauthorized('Access denied. Super admin privileges required.', request);
    }

    // Clear all logs
    errorLogger.clearLogs();

    // Log the action
    errorLogger.logInfo(
      'All error logs cleared by administrator',
      { 
        adminId: session.user?.id,
        adminEmail: session.user?.email,
      },
      request
    );

    return apiResponse.success('All error logs have been cleared successfully', undefined, undefined, {
      endpoint: request.nextUrl?.pathname,
      method: request.method,
      requestId: request.headers.get('x-request-id') || undefined,
    });

  } catch (error) {
    return apiResponse.error('Failed to clear error logs', 500, error instanceof Error ? error.message : 'Unknown error', request);
  }
}
