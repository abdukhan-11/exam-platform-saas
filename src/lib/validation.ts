export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors: Record<string, string[]>;
}

export interface FieldValidation {
  [key: string]: ValidationRule;
}

export class Validator {
  private rules: FieldValidation;
  private customMessages: Record<string, string>;

  constructor(rules: FieldValidation, customMessages: Record<string, string> = {}) {
    this.rules = rules;
    this.customMessages = customMessages;
  }

  validate(data: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const fieldErrors: Record<string, string[]> = {};

    for (const [field, rule] of Object.entries(this.rules)) {
      const value = data[field];
      const fieldError = this.validateField(field, value, rule);
      
      if (fieldError) {
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(fieldError);
        errors.push(fieldError);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      fieldErrors,
    };
  }

  private validateField(field: string, value: any, rule: ValidationRule): string | null {
    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      return this.getMessage(field, 'required', `${field} is required`);
    }

    // Skip other validations if value is empty and not required
    if (value === undefined || value === null || value === '') {
      return null;
    }

    // Type check for string values
    if (typeof value === 'string') {
      // Min length check
      if (rule.minLength && value.length < rule.minLength) {
        return this.getMessage(
          field, 
          'minLength', 
          `${field} must be at least ${rule.minLength} characters long`
        );
      }

      // Max length check
      if (rule.maxLength && value.length > rule.maxLength) {
        return this.getMessage(
          field, 
          'maxLength', 
          `${field} must be no more than ${rule.maxLength} characters long`
        );
      }

      // Pattern check
      if (rule.pattern && !rule.pattern.test(value)) {
        return this.getMessage(
          field, 
          'pattern', 
          `${field} format is invalid`
        );
      }
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (result === false) {
        return this.getMessage(field, 'custom', `${field} validation failed`);
      } else if (typeof result === 'string') {
        return result;
      }
    }

    return null;
  }

  private getMessage(field: string, ruleType: string, defaultMessage: string): string {
    const customKey = `${field}.${ruleType}`;
    return this.customMessages[customKey] || this.customMessages[field] || defaultMessage;
  }
}

// Predefined validation rules for common use cases
export const commonValidations = {
  required: { required: true },
  email: { 
    required: true, 
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  },
  phone: { 
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    message: 'Please enter a valid phone number'
  },
  url: { 
    pattern: /^https?:\/\/.+/,
    message: 'Please enter a valid URL starting with http:// or https://'
  },
  name: { 
    required: true, 
    minLength: 2, 
    maxLength: 100,
    pattern: /^[a-zA-Z\s\-'\.]+$/,
    message: 'Name must contain only letters, spaces, hyphens, apostrophes, and periods'
  },
  address: { 
    minLength: 10, 
    maxLength: 200,
    message: 'Address must be between 10 and 200 characters'
  },
};

// College-specific validation rules
export const collegeValidationRules: FieldValidation = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-'\.&()]+$/,
    message: 'College name must be between 2-100 characters and contain only letters, numbers, spaces, and common punctuation'
  },
  address: {
    minLength: 10,
    maxLength: 200,
    message: 'Address must be between 10-200 characters'
  },
  phone: {
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    message: 'Please enter a valid phone number'
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  },
  website: {
    pattern: /^https?:\/\/.+/,
    message: 'Website must start with http:// or https://'
  }
};

// User-specific validation rules
export const userValidationRules: FieldValidation = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
  },
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s\-'\.]+$/,
    message: 'First name must contain only letters, spaces, hyphens, apostrophes, and periods'
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s\-'\.]+$/,
    message: 'Last name must contain only letters, spaces, hyphens, apostrophes, and periods'
  }
};

// Helper function to create a validator instance
export function createValidator(rules: FieldValidation, customMessages?: Record<string, string>): Validator {
  return new Validator(rules, customMessages);
}

// Helper function for quick validation
export function validateData(
  data: Record<string, any>, 
  rules: FieldValidation, 
  customMessages?: Record<string, string>
): ValidationResult {
  const validator = createValidator(rules, customMessages);
  return validator.validate(data);
}

// Async validation support
export async function validateDataAsync(
  data: Record<string, any>, 
  rules: FieldValidation, 
  customMessages?: Record<string, string>,
  asyncValidators?: Record<string, (value: any) => Promise<boolean | string>>
): Promise<ValidationResult> {
  const validator = createValidator(rules, customMessages);
  const result = validator.validate(data);

  // Run async validators if provided
  if (asyncValidators) {
    for (const [field, asyncValidator] of Object.entries(asyncValidators)) {
      if (data[field] && result.fieldErrors[field]?.length === 0) {
        try {
          const asyncResult = await asyncValidator(data[field]);
          if (asyncResult === false) {
            const errorMessage = `${field} validation failed`;
            if (!result.fieldErrors[field]) {
              result.fieldErrors[field] = [];
            }
            result.fieldErrors[field].push(errorMessage);
            result.errors.push(errorMessage);
            result.isValid = false;
          } else if (typeof asyncResult === 'string') {
            if (!result.fieldErrors[field]) {
              result.fieldErrors[field] = [];
            }
            result.fieldErrors[field].push(asyncResult);
            result.errors.push(asyncResult);
            result.isValid = false;
          }
        } catch (error) {
          const errorMessage = `Error validating ${field}`;
          if (!result.fieldErrors[field]) {
            result.fieldErrors[field] = [];
          }
          result.fieldErrors[field].push(errorMessage);
          result.errors.push(errorMessage);
          result.isValid = false;
        }
      }
    }
  }

  return result;
}
