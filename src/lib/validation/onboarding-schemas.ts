import { z } from 'zod';

// Common validation patterns
const commonPatterns = {
  username: /^[a-zA-Z0-9_-]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  url: /^https?:\/\/.+/,
  name: /^[a-zA-Z\s\-'\.]+$/,
  institutionName: /^[a-zA-Z0-9\s\-'\.&()]+$/,
  rollNumber: /^[A-Za-z0-9\-_]+$/,
  department: /^[a-zA-Z\s\-'\.&()]+$/
};

// College selection form schema
export const collegeSelectionSchema = z.object({
  collegeUsername: z.string()
    .min(3, 'College username must be at least 3 characters')
    .max(50, 'College username must be no more than 50 characters')
    .regex(commonPatterns.username, 'College username can only contain letters, numbers, hyphens, and underscores')
});

// College registration form schema (enhanced)
export const collegeRegistrationSchema = z.object({
  // Basic Information
  name: z.string()
    .min(2, 'Institution name must be at least 2 characters')
    .max(100, 'Institution name must be no more than 100 characters')
    .regex(commonPatterns.institutionName, 'Institution name contains invalid characters'),
  
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be no more than 50 characters')
    .regex(commonPatterns.username, 'Username can only contain letters, numbers, hyphens, and underscores'),
  
  // Contact Information
  email: z.string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be no more than 100 characters')
    .regex(commonPatterns.email, 'Please enter a valid email address'),
  
  contactPerson: z.string()
    .min(2, 'Contact person name must be at least 2 characters')
    .max(100, 'Contact person name must be no more than 100 characters')
    .regex(commonPatterns.name, 'Contact person name contains invalid characters'),
  
  phone: z.string()
    .optional()
    .refine((val) => !val || commonPatterns.phone.test(val), {
      message: 'Please enter a valid phone number'
    }),
  
  website: z.string()
    .optional()
    .refine((val) => !val || commonPatterns.url.test(val), {
      message: 'Website must start with http:// or https://'
    }),
  
  // Address Information
  address: z.string()
    .optional()
    .refine((val) => !val || val.length >= 10, {
      message: 'Address must be at least 10 characters if provided'
    })
    .refine((val) => !val || val.length <= 200, {
      message: 'Address must be no more than 200 characters'
    }),
  
  city: z.string()
    .optional()
    .refine((val) => !val || val.length >= 2, {
      message: 'City must be at least 2 characters if provided'
    })
    .refine((val) => !val || val.length <= 50, {
      message: 'City must be no more than 50 characters'
    }),
  
  state: z.string()
    .optional()
    .refine((val) => !val || val.length >= 2, {
      message: 'State must be at least 2 characters if provided'
    })
    .refine((val) => !val || val.length <= 50, {
      message: 'State must be no more than 50 characters'
    }),
  
  country: z.string()
    .optional()
    .refine((val) => !val || val.length >= 2, {
      message: 'Country must be at least 2 characters if provided'
    })
    .refine((val) => !val || val.length <= 50, {
      message: 'Country must be no more than 50 characters'
    }),
  
  description: z.string()
    .optional()
    .refine((val) => !val || val.length <= 500, {
      message: 'Description must be no more than 500 characters'
    })
});

// User registration form schema
export const userRegistrationSchema = z.object({
  // Basic Information
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be no more than 50 characters')
    .regex(commonPatterns.name, 'First name contains invalid characters'),
  
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be no more than 50 characters')
    .regex(commonPatterns.name, 'Last name contains invalid characters'),
  
  email: z.string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be no more than 100 characters')
    .regex(commonPatterns.email, 'Please enter a valid email address'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be no more than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  confirmPassword: z.string()
    .min(8, 'Confirm password must be at least 8 characters'),
  
  // Role-specific fields
  role: z.enum(['STUDENT', 'TEACHER'], {
    message: 'Please select a valid role'
  }),
  
  // Student-specific fields
  rollNumber: z.string()
    .optional()
    .refine((val) => !val || commonPatterns.rollNumber.test(val), {
      message: 'Roll number can only contain letters, numbers, hyphens, and underscores'
    }),
  
  department: z.string()
    .optional()
    .refine((val) => !val || val.length >= 2, {
      message: 'Department must be at least 2 characters if provided'
    })
    .refine((val) => !val || val.length <= 50, {
      message: 'Department must be no more than 50 characters'
    }),
  
  year: z.string()
    .optional()
    .refine((val) => !val || /^(1|2|3|4|First|Second|Third|Fourth|1st|2nd|3rd|4th)$/i.test(val), {
      message: 'Please enter a valid year (1, 2, 3, 4, First, Second, Third, Fourth)'
    }),
  
  // Teacher-specific fields
  phone: z.string()
    .optional()
    .refine((val) => !val || commonPatterns.phone.test(val), {
      message: 'Please enter a valid phone number'
    }),
  
  teacherDepartment: z.string()
    .optional()
    .refine((val) => !val || val.length >= 2, {
      message: 'Department must be at least 2 characters if provided'
    })
    .refine((val) => !val || val.length <= 50, {
      message: 'Department must be no more than 50 characters'
    })
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
}).refine((data) => {
  // Student-specific validation
  if (data.role === 'STUDENT') {
    if (!data.rollNumber || data.rollNumber.trim() === '') {
      return false;
    }
    if (!data.department || data.department.trim() === '') {
      return false;
    }
    if (!data.year || data.year.trim() === '') {
      return false;
    }
  }
  return true;
}, {
  message: 'Student fields are required for student role',
  path: ['role']
}).refine((data) => {
  // Teacher-specific validation
  if (data.role === 'TEACHER') {
    if (!data.phone || data.phone.trim() === '') {
      return false;
    }
    if (!data.teacherDepartment || data.teacherDepartment.trim() === '') {
      return false;
    }
  }
  return true;
}, {
  message: 'Teacher fields are required for teacher role',
  path: ['role']
});

// Login form schema
export const loginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be no more than 100 characters'),
  
  password: z.string()
    .min(1, 'Password is required')
    .max(100, 'Password must be no more than 100 characters'),
  
  rememberMe: z.boolean().optional()
});

// Student login form schema
export const studentLoginSchema = z.object({
  rollNumber: z.string()
    .min(1, 'Roll number is required')
    .max(50, 'Roll number must be no more than 50 characters')
    .regex(commonPatterns.rollNumber, 'Roll number can only contain letters, numbers, hyphens, and underscores'),
  
  password: z.string()
    .min(1, 'Password is required')
    .max(100, 'Password must be no more than 100 characters'),
  
  rememberMe: z.boolean().optional()
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be no more than 100 characters'),
  
  collegeUsername: z.string()
    .min(3, 'College username must be at least 3 characters')
    .max(50, 'College username must be no more than 50 characters')
    .regex(commonPatterns.username, 'College username can only contain letters, numbers, hyphens, and underscores')
});

// Password reset schema
export const passwordResetSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required'),
  
  email: z.string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be no more than 100 characters'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be no more than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  confirmPassword: z.string()
    .min(8, 'Confirm password must be at least 8 characters')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// Type exports
export type CollegeSelectionFormData = z.infer<typeof collegeSelectionSchema>;
export type CollegeRegistrationFormData = z.infer<typeof collegeRegistrationSchema>;
export type UserRegistrationFormData = z.infer<typeof userRegistrationSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type StudentLoginFormData = z.infer<typeof studentLoginSchema>;
export type PasswordResetRequestFormData = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data?: any;
}
