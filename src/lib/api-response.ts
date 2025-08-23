import { NextRequest } from 'next/server';
import { errorLogger } from './error-logger';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errorId?: string;
  timestamp: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metadata?: {
    requestId?: string;
    endpoint?: string;
    method?: string;
    processingTime?: number;
  };
}

export class ApiResponseHandler {
  static success<T>(
    message: string,
    data?: T,
    pagination?: ApiResponse<T>['pagination'],
    metadata?: ApiResponse<T>['metadata']
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      ...(pagination && { pagination }),
      ...(metadata && { metadata }),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  static created<T>(
    message: string,
    data?: T,
    metadata?: ApiResponse<T>['metadata']
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      ...(metadata && { metadata }),
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  static error(
    message: string,
    status: number = 500,
    error?: string,
    request?: NextRequest,
    details?: any
  ): Response {
    const errorId = errorLogger.logError(message, new Error(error || message), request);
    
    const response: ApiResponse = {
      success: false,
      message,
      error: error || message,
      errorId,
      timestamp: new Date().toISOString(),
      metadata: {
        endpoint: request?.nextUrl?.pathname,
        method: request?.method,
      },
    };

    return new Response(JSON.stringify(response), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  static validationError(
    message: string,
    errors: string[],
    request?: NextRequest
  ): Response {
    const errorId = errorLogger.logWarning(message, { validationErrors: errors }, request);
    
    const response: ApiResponse = {
      success: false,
      message,
      error: 'Validation failed',
      errorId,
      timestamp: new Date().toISOString(),
      data: { validationErrors: errors },
      metadata: {
        endpoint: request?.nextUrl?.pathname,
        method: request?.method,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  static conflict(
    message: string,
    details?: any,
    request?: NextRequest
  ): Response {
    const errorId = errorLogger.logWarning(message, details, request);
    
    const response: ApiResponse = {
      success: false,
      message,
      error: 'Conflict',
      errorId,
      timestamp: new Date().toISOString(),
      ...(details && { data: details }),
      metadata: {
        endpoint: request?.nextUrl?.pathname,
        method: request?.method,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 409,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  static notFound(
    message: string,
    request?: NextRequest
  ): Response {
    const errorId = errorLogger.logWarning(message, { resource: 'not found' }, request);
    
    const response: ApiResponse = {
      success: false,
      message,
      error: 'Not found',
      errorId,
      timestamp: new Date().toISOString(),
      metadata: {
        endpoint: request?.nextUrl?.pathname,
        method: request?.method,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  static unauthorized(
    message: string = 'Unauthorized',
    request?: NextRequest
  ): Response {
    const errorId = errorLogger.logWarning(message, { reason: 'unauthorized' }, request);
    
    const response: ApiResponse = {
      success: false,
      message,
      error: 'Unauthorized',
      errorId,
      timestamp: new Date().toISOString(),
      metadata: {
        endpoint: request?.nextUrl?.pathname,
        method: request?.method,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  static forbidden(
    message: string = 'Forbidden',
    request?: NextRequest
  ): Response {
    const errorId = errorLogger.logWarning(message, { reason: 'forbidden' }, request);
    
    const response: ApiResponse = {
      success: false,
      message,
      error: 'Forbidden',
      errorId,
      timestamp: new Date().toISOString(),
      metadata: {
        endpoint: request?.nextUrl?.pathname,
        method: request?.method,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  static withPagination<T>(
    message: string,
    data: T[],
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    },
    metadata?: ApiResponse<T[]>['metadata']
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      pagination: {
        ...pagination,
        hasNext: pagination.page < pagination.pages,
        hasPrev: pagination.page > 1,
      },
      ...(metadata && { metadata }),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Convenience functions
export const apiResponse = {
  success: ApiResponseHandler.success,
  created: ApiResponseHandler.created,
  error: ApiResponseHandler.error,
  validationError: ApiResponseHandler.validationError,
  conflict: ApiResponseHandler.conflict,
  notFound: ApiResponseHandler.notFound,
  unauthorized: ApiResponseHandler.unauthorized,
  forbidden: ApiResponseHandler.forbidden,
  withPagination: ApiResponseHandler.withPagination,
};
