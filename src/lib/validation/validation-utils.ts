import { z } from 'zod';
import { ValidationError, ValidationResult } from './onboarding-schemas';
import { ValidationErrorHandler } from './error-handler';

/**
 * Validation utilities for form handling and error management
 */
export class ValidationUtils {
  private errorHandler: ValidationErrorHandler;

  constructor(errorHandler?: ValidationErrorHandler) {
    this.errorHandler = errorHandler || new ValidationErrorHandler();
  }

  /**
   * Validate form data against a Zod schema
   */
  validateFormData<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context?: string
  ): ValidationResult {
    try {
      const validatedData = schema.parse(data);
      return {
        isValid: true,
        data: validatedData,
        errors: []
      };
    } catch (error) {
      return this.errorHandler.handleValidationError(error, context);
    }
  }

  /**
   * Validate individual field
   */
  validateField<T>(
    schema: z.ZodSchema<T>,
    value: unknown,
    fieldName: string
  ): { isValid: boolean; error?: string } {
    try {
      schema.parse(value);
      return { isValid: true };
    } catch (error: any) {
      if (error.issues && error.issues.length > 0) {
        return { isValid: false, error: error.issues[0].message };
      }
      return { isValid: false, error: 'Invalid value' };
    }
  }

  /**
   * Sanitize input to prevent XSS attacks
   */
  sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Sanitize form data object
   */
  sanitizeFormData<T extends Record<string, any>>(data: T): T {
    const sanitized = { ...data };
    
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'string') {
        (sanitized as any)[key] = this.sanitizeInput(sanitized[key] as string);
      }
    }
    
    return sanitized;
  }

  /**
   * Debounce validation function
   */
  debounceValidation<T>(
    validationFn: (value: T) => ValidationResult,
    delay: number = 300
  ): (value: T) => Promise<ValidationResult> {
    let timeoutId: NodeJS.Timeout;
    
    return (value: T): Promise<ValidationResult> => {
      return new Promise((resolve) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          resolve(validationFn(value));
        }, delay);
      });
    };
  }

  /**
   * Create field validation state
   */
  createFieldValidationState() {
    return {
      isValid: false,
      isTouched: false,
      error: '',
      isDirty: false
    };
  }

  /**
   * Update field validation state
   */
  updateFieldValidationState(
    currentState: Record<string, any>,
    newState: Partial<Record<string, any>>
  ) {
    return {
      ...currentState,
      ...newState,
      isDirty: true
    };
  }

  /**
   * Check if form is valid based on field states
   */
  isFormValid(fieldStates: Record<string, any>): boolean {
    return Object.values(fieldStates).every((state: any) => 
      state.isValid || !state.isTouched
    );
  }

  /**
   * Get form errors summary
   */
  getFormErrorsSummary(fieldStates: Record<string, any>): string[] {
    const errors: string[] = [];
    
    Object.entries(fieldStates).forEach(([field, state]: [string, any]) => {
      if (state.isTouched && !state.isValid && state.error) {
        errors.push(`${field}: ${state.error}`);
      }
    });
    
    return errors;
  }

  /**
   * Create progressive enhancement fallback
   */
  createProgressiveEnhancement(
    enhancedHandler: () => void,
    fallbackHandler: () => void
  ): () => void {
    return () => {
      try {
        // Check if enhanced features are available
        if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
          enhancedHandler();
        } else {
          fallbackHandler();
        }
      } catch (error) {
        // Fallback to basic functionality
        fallbackHandler();
      }
    };
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isValid: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Password should be at least 8 characters long');
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password should contain at least one uppercase letter');
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password should contain at least one lowercase letter');
    }

    // Number check
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password should contain at least one number');
    }

    // Special character check
    if (/[@$!%*?&]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password should contain at least one special character (@$!%*?&)');
    }

    // Length bonus
    if (password.length >= 12) {
      score += 1;
    }

    return {
      score,
      feedback,
      isValid: score >= 4
    };
  }

  /**
   * Format validation errors for display
   */
  formatValidationErrors(errors: ValidationError[]): Record<string, string> {
    const formatted: Record<string, string> = {};
    
    errors.forEach(error => {
      formatted[error.field] = error.message;
    });
    
    return formatted;
  }

  /**
   * Create loading state manager
   */
  createLoadingStateManager() {
    let loadingStates: Record<string, boolean> = {};
    
    return {
      setLoading: (key: string, isLoading: boolean) => {
        loadingStates[key] = isLoading;
      },
      isLoading: (key: string) => loadingStates[key] || false,
      isAnyLoading: () => Object.values(loadingStates).some(Boolean),
      clearAll: () => {
        loadingStates = {};
      }
    };
  }

  /**
   * Create retry mechanism for form submissions
   */
  createRetryMechanism(
    submitFn: () => Promise<any>,
    maxRetries: number = 3,
    delay: number = 1000
  ) {
    return async (): Promise<any> => {
      let lastError: any;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await submitFn();
        } catch (error) {
          lastError = error;
          
          if (attempt === maxRetries) {
            break;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        }
      }
      
      throw lastError;
    };
  }
}

// Default validation utils instance
export const defaultValidationUtils = new ValidationUtils();

// Common validation patterns
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  username: /^[a-zA-Z0-9_-]+$/,
  name: /^[a-zA-Z\s\-'\.]+$/,
  rollNumber: /^[A-Za-z0-9\-_]+$/,
  url: /^https?:\/\/.+/
};

// Common validation messages
export const validationMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  username: 'Username can only contain letters, numbers, hyphens, and underscores',
  name: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods',
  rollNumber: 'Roll number can only contain letters, numbers, hyphens, and underscores',
  url: 'Please enter a valid URL starting with http:// or https://',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be no more than ${max} characters`,
  passwordStrength: 'Password must contain uppercase, lowercase, number, and special character'
};
