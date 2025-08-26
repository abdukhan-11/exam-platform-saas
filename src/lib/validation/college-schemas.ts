import { z } from 'zod';

// College registration form schema
export const collegeRegistrationSchema = z.object({
  // Basic Information
  name: z.string()
    .min(2, 'Institution name must be at least 2 characters')
    .max(100, 'Institution name must be no more than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-'\.&()]+$/, 'Institution name contains invalid characters'),
  
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be no more than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  
  // Contact Information
  email: z.string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be no more than 100 characters'),
  
  contactPerson: z.string()
    .min(2, 'Contact person name must be at least 2 characters')
    .max(100, 'Contact person name must be no more than 100 characters')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Contact person name contains invalid characters'),
  
  phone: z.string()
    .optional()
    .refine((val) => !val || /^[\+]?[1-9][\d]{0,15}$/.test(val), {
      message: 'Please enter a valid phone number'
    }),
  
  website: z.string()
    .optional()
    .refine((val) => !val || /^https?:\/\/.+/.test(val), {
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

// Username availability check schema
export const usernameCheckSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be no more than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
});

// Type exports
export type CollegeRegistrationFormData = z.infer<typeof collegeRegistrationSchema>;
export type UsernameCheckData = z.infer<typeof usernameCheckSchema>;
