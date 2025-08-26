import { useState, useCallback } from 'react';
import { collegeRegistrationSchema, CollegeRegistrationFormData } from '@/lib/validation/college-schemas';
import { z } from 'zod';

interface ValidationState {
  isValid: boolean;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
}

export function useFormValidation() {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: false,
    errors: {},
    touched: {}
  });

  const validateField = useCallback((field: keyof CollegeRegistrationFormData, value: any): string[] => {
    try {
      const fieldSchema = collegeRegistrationSchema.shape[field];
      fieldSchema.parse(value);
      return [];
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.issues.map((err: z.ZodIssue) => err.message);
      }
      return ['Invalid value'];
    }
  }, []);

  const validateForm = useCallback((formData: Partial<CollegeRegistrationFormData>): boolean => {
    try {
      collegeRegistrationSchema.parse(formData);
      setValidationState(prev => ({
        ...prev,
        isValid: true,
        errors: {}
      }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        error.issues.forEach((err: z.ZodIssue) => {
          const field = err.path[0] as string;
          if (!fieldErrors[field]) {
            fieldErrors[field] = [];
          }
          fieldErrors[field].push(err.message);
        });

        setValidationState(prev => ({
          ...prev,
          isValid: false,
          errors: fieldErrors
        }));
      }
      return false;
    }
  }, []);

  const setFieldTouched = useCallback((field: keyof CollegeRegistrationFormData) => {
    setValidationState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [field]: true
      }
    }));
  }, []);

  const getFieldError = useCallback((field: keyof CollegeRegistrationFormData): string | undefined => {
    const errors = validationState.errors[field];
    const isTouched = validationState.touched[field];
    
    if (isTouched && errors && errors.length > 0) {
      return errors[0];
    }
    return undefined;
  }, [validationState]);

  const hasFieldError = useCallback((field: keyof CollegeRegistrationFormData): boolean => {
    const isTouched = validationState.touched[field];
    const hasErrors = validationState.errors[field] && validationState.errors[field].length > 0;
    return isTouched && hasErrors;
  }, [validationState]);

  const resetValidation = useCallback(() => {
    setValidationState({
      isValid: false,
      errors: {},
      touched: {}
    });
  }, []);

  return {
    validationState,
    validateField,
    validateForm,
    setFieldTouched,
    getFieldError,
    hasFieldError,
    resetValidation
  };
}
