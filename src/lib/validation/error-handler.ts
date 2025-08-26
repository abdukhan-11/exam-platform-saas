import { ValidationError, ValidationResult } from './onboarding-schemas';

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: any;
  timestamp: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface ErrorHandlerConfig {
  retryConfig: RetryConfig;
  enableLogging: boolean;
  enableRetry: boolean;
}

export class ValidationErrorHandler {
  private config: ErrorHandlerConfig;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
      },
      enableLogging: true,
      enableRetry: true,
      ...config
    };
  }

  /**
   * Handle validation errors with detailed error information
   */
  handleValidationError(error: any, context?: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (error.issues && Array.isArray(error.issues)) {
      // Zod validation errors
      error.issues.forEach((issue: any) => {
        errors.push({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code || 'VALIDATION_ERROR'
        });
      });
    } else if (error.message) {
      // Generic error
      errors.push({
        field: 'general',
        message: error.message,
        code: 'GENERAL_ERROR'
      });
    } else {
      // Unknown error
      errors.push({
        field: 'general',
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR'
      });
    }

    if (this.config.enableLogging) {
      console.error(`Validation error in ${context || 'unknown context'}:`, {
        errors,
        originalError: error,
        timestamp: new Date().toISOString()
      });
    }

    return {
      isValid: false,
      errors
    };
  }

  /**
   * Handle API errors with retry mechanism
   */
  async handleApiError<T>(
    apiCall: () => Promise<T>,
    context?: string,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.config.retryConfig, ...customRetryConfig };
    let lastError: any;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const result = await apiCall();
        
        if (this.config.enableLogging && attempt > 0) {
          console.log(`API call succeeded on attempt ${attempt + 1} in ${context || 'unknown context'}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (this.config.enableLogging) {
          console.error(`API call failed on attempt ${attempt + 1} in ${context || 'unknown context'}:`, error);
        }

        // Don't retry on the last attempt
        if (attempt === retryConfig.maxRetries) {
          break;
        }

        // Don't retry if retry is disabled
        if (!this.config.enableRetry) {
          break;
        }

        // Don't retry on certain error types
        if (this.shouldNotRetry(error)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
          retryConfig.maxDelay
        );

        if (this.config.enableLogging) {
          console.log(`Retrying in ${delay}ms...`);
        }

        await this.delay(delay);
      }
    }

    throw this.formatApiError(lastError, context);
  }

  /**
   * Determine if an error should not be retried
   */
  private shouldNotRetry(error: any): boolean {
    // Don't retry on client errors (4xx)
    if (error.status >= 400 && error.status < 500) {
      return true;
    }

    // Don't retry on validation errors
    if (error.code === 'VALIDATION_ERROR' || error.code === 'INVALID_INPUT') {
      return true;
    }

    // Don't retry on authentication errors
    if (error.status === 401 || error.status === 403) {
      return true;
    }

    return false;
  }

  /**
   * Format API error for consistent error handling
   */
  private formatApiError(error: any, context?: string): ApiError {
    return {
      message: error.message || 'An unexpected error occurred',
      code: error.code || 'API_ERROR',
      status: error.status || 500,
      details: error.details || null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Delay execution for retry mechanism
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create user-friendly error messages
   */
  createUserFriendlyMessage(error: ApiError): string {
    const errorMessages: Record<string, string> = {
      'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection and try again.',
      'TIMEOUT_ERROR': 'The request took too long to complete. Please try again.',
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'AUTHENTICATION_ERROR': 'Authentication failed. Please check your credentials.',
      'AUTHORIZATION_ERROR': 'You do not have permission to perform this action.',
      'NOT_FOUND_ERROR': 'The requested resource was not found.',
      'CONFLICT_ERROR': 'This action conflicts with existing data. Please check and try again.',
      'RATE_LIMIT_ERROR': 'Too many requests. Please wait a moment and try again.',
      'SERVER_ERROR': 'A server error occurred. Please try again later.',
      'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again.'
    };

    return errorMessages[error.code] || error.message;
  }

  /**
   * Log error for debugging and monitoring
   */
  logError(error: any, context?: string, additionalData?: any): void {
    if (!this.config.enableLogging) return;

    const errorLog = {
      timestamp: new Date().toISOString(),
      context: context || 'unknown',
      error: {
        message: error.message,
        code: error.code,
        status: error.status,
        stack: error.stack
      },
      additionalData,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    };

    console.error('Error logged:', errorLog);
  }
}

// Default error handler instance
export const defaultErrorHandler = new ValidationErrorHandler();

// Utility functions for common error handling scenarios
export const handleFormSubmission = async <T>(
  submitFn: () => Promise<T>,
  context: string = 'form submission'
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const data = await defaultErrorHandler.handleApiError(submitFn, context);
    return { success: true, data };
  } catch (error: any) {
    const userFriendlyMessage = defaultErrorHandler.createUserFriendlyMessage(error);
    defaultErrorHandler.logError(error, context);
    return { success: false, error: userFriendlyMessage };
  }
};

export const handleValidation = (
  validationFn: () => ValidationResult,
  context: string = 'validation'
): ValidationResult => {
  try {
    return validationFn();
  } catch (error) {
    return defaultErrorHandler.handleValidationError(error, context);
  }
};
