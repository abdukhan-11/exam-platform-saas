import { NextRequest } from 'next/server';

export interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  details?: any;
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  stack?: string;
}

export interface ErrorLogResponse {
  success: boolean;
  message: string;
  logId?: string;
  timestamp: string;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  log(entry: Omit<ErrorLogEntry, 'timestamp'>): string {
    const logEntry: ErrorLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${logEntry.level.toUpperCase()}] ${logEntry.message}`, {
        timestamp: logEntry.timestamp,
        details: logEntry.details,
        endpoint: logEntry.endpoint,
        method: logEntry.method,
      });
    }

    return logEntry.timestamp;
  }

  logError(
    message: string,
    error: Error | any,
    request?: NextRequest,
    userId?: string
  ): string {
    const entry: Omit<ErrorLogEntry, 'timestamp'> = {
      level: 'error',
      message,
      details: {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        status: error?.status,
      },
      stack: error?.stack,
      requestId: request?.headers.get('x-request-id') || undefined,
      userId,
      endpoint: request?.nextUrl?.pathname,
      method: request?.method,
      userAgent: request?.headers.get('user-agent') || undefined,
      ip: request?.headers.get('x-forwarded-for') || 'unknown',
    };

    return this.log(entry);
  }

  logWarning(
    message: string,
    details?: any,
    request?: NextRequest,
    userId?: string
  ): string {
    const entry: Omit<ErrorLogEntry, 'timestamp'> = {
      level: 'warn',
      message,
      details,
      requestId: request?.headers.get('x-request-id') || undefined,
      userId,
      endpoint: request?.nextUrl?.pathname,
      method: request?.method,
    };

    return this.log(entry);
  }

  logInfo(
    message: string,
    details?: any,
    request?: NextRequest,
    userId?: string
  ): string {
    const entry: Omit<ErrorLogEntry, 'timestamp'> = {
      level: 'info',
      message,
      details,
      requestId: request?.headers.get('x-request-id') || undefined,
      userId,
      endpoint: request?.nextUrl?.pathname,
      method: request?.method,
    };

    return this.log(entry);
  }

  getLogs(level?: 'error' | 'warn' | 'info', limit: number = 100): ErrorLogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    return filteredLogs.slice(-limit).reverse(); // Most recent first
  }

  getErrorStats(): { total: number; errors: number; warnings: number; info: number } {
    return {
      total: this.logs.length,
      errors: this.logs.filter(log => log.level === 'error').length,
      warnings: this.logs.filter(log => log.level === 'warn').length,
      info: this.logs.filter(log => log.level === 'info').length,
    };
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const errorLogger = new ErrorLogger();

// Helper function to extract user ID from session
export function extractUserIdFromRequest(request: NextRequest): string | undefined {
  // This would typically extract from JWT token or session
  // For now, we'll return undefined
  return undefined;
}

// Helper function to create standardized error responses
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: any,
  request?: NextRequest
): Response {
  const errorId = errorLogger.logError(message, new Error(message), request);
  
  return new Response(
    JSON.stringify({
      success: false,
      message,
      errorId,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
