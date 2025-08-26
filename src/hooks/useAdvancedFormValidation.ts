import { useState, useCallback, useRef, useEffect } from 'react';
import { z } from 'zod';
import { ValidationError, ValidationResult } from '@/lib/validation/onboarding-schemas';
import { ValidationUtils } from '@/lib/validation/validation-utils';
import { ValidationErrorHandler } from '@/lib/validation/error-handler';

interface FieldValidationState {
  isValid: boolean;
  isTouched: boolean;
  error: string;
  isDirty: boolean;
  isPending: boolean;
}

interface FormValidationState {
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  hasErrors: boolean;
  fieldStates: Record<string, FieldValidationState>;
  globalError: string;
}

interface UseAdvancedFormValidationOptions {
  schema: z.ZodSchema<any>;
  initialValues?: Record<string, any>;
  debounceMs?: number;
  enableProgressiveEnhancement?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
}

export function useAdvancedFormValidation<T extends Record<string, any>>(
  options: UseAdvancedFormValidationOptions
) {
  const {
    schema,
    initialValues = {},
    debounceMs = 300,
    enableProgressiveEnhancement = true,
    enableRetry = true,
    maxRetries = 3
  } = options;

  const validationUtils = useRef(new ValidationUtils()).current;
  const errorHandler = useRef(new ValidationErrorHandler()).current;
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const [formData, setFormData] = useState<T>(initialValues as T);
  const [validationState, setValidationState] = useState<FormValidationState>({
    isValid: false,
    isDirty: false,
    isSubmitting: false,
    hasErrors: false,
    fieldStates: {},
    globalError: ''
  });

  // Initialize field states
  useEffect(() => {
    const fieldStates: Record<string, FieldValidationState> = {};
    Object.keys(initialValues).forEach(field => {
      fieldStates[field] = {
        isValid: false,
        isTouched: false,
        error: '',
        isDirty: false,
        isPending: false
      };
    });
    
    setValidationState(prev => ({
      ...prev,
      fieldStates
    }));
  }, [initialValues]);

  // Validate entire form
  const validateForm = useCallback((): ValidationResult => {
    try {
      const validatedData = schema.parse(formData);
      return {
        isValid: true,
        data: validatedData,
        errors: []
      };
    } catch (error) {
      return errorHandler.handleValidationError(error, 'form validation');
    }
  }, [schema, formData, errorHandler]);

  // Validate individual field
  const validateField = useCallback((fieldName: string, value: any): ValidationResult => {
    try {
      // Create a partial data object with just this field
      const partialData = { [fieldName]: value };
      
      // Try to parse the partial data against the full schema
      // This will only validate the field we're interested in
      schema.parse(partialData);
      return { isValid: true, errors: [] };
    } catch (error) {
      return errorHandler.handleValidationError(error, `field validation: ${fieldName}`);
    }
  }, [schema, errorHandler]);

  // Debounced field validation
  const debouncedValidateField = useCallback(
    validationUtils.debounceValidation(
      (params: { fieldName: string; value: any }) => validateField(params.fieldName, params.value),
      debounceMs
    ),
    [validateField, debounceMs, validationUtils]
  );

  // Update field value and validate
  const updateField = useCallback((fieldName: string, value: any) => {
    // Sanitize input
    const sanitizedValue = typeof value === 'string' 
      ? validationUtils.sanitizeInput(value)
      : value;

    // Update form data
    setFormData(prev => ({
      ...prev,
      [fieldName]: sanitizedValue
    }));

    // Mark field as touched and dirty
    setValidationState(prev => ({
      ...prev,
      isDirty: true,
      fieldStates: {
        ...prev.fieldStates,
        [fieldName]: {
          ...prev.fieldStates[fieldName],
          isTouched: true,
          isDirty: true,
          isPending: true
        }
      }
    }));

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounced validation
    debounceTimeoutRef.current = setTimeout(async () => {
      const result = await debouncedValidateField({ fieldName, value: sanitizedValue });
      
      setValidationState(prev => ({
        ...prev,
        fieldStates: {
          ...prev.fieldStates,
          [fieldName]: {
            ...prev.fieldStates[fieldName],
            isValid: result.isValid,
            error: result.errors.length > 0 ? result.errors[0].message : '',
            isPending: false
          }
        }
      }));
    }, debounceMs);
  }, [debouncedValidateField, debounceMs, validationUtils]);

  // Mark field as touched
  const touchField = useCallback((fieldName: string) => {
    setValidationState(prev => ({
      ...prev,
      fieldStates: {
        ...prev.fieldStates,
        [fieldName]: {
          ...prev.fieldStates[fieldName],
          isTouched: true
        }
      }
    }));
  }, []);

  // Get field error
  const getFieldError = useCallback((fieldName: string): string => {
    const fieldState = validationState.fieldStates[fieldName];
    return fieldState?.isTouched && !fieldState?.isValid ? fieldState.error : '';
  }, [validationState.fieldStates]);

  // Check if field has error
  const hasFieldError = useCallback((fieldName: string): boolean => {
    const fieldState = validationState.fieldStates[fieldName];
    return fieldState?.isTouched && !fieldState?.isValid;
  }, [validationState.fieldStates]);

  // Check if field is valid
  const isFieldValid = useCallback((fieldName: string): boolean => {
    const fieldState = validationState.fieldStates[fieldName];
    return fieldState?.isValid || !fieldState?.isTouched;
  }, [validationState.fieldStates]);

  // Submit form with retry mechanism
  const submitForm = useCallback(async (
    submitFn: (data: T) => Promise<any>
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    // Validate form before submission
    const validationResult = validateForm();
    if (!validationResult.isValid) {
      const errorMessage = validationResult.errors.length > 0 
        ? validationResult.errors[0].message 
        : 'Please fix the validation errors';
      return { success: false, error: errorMessage };
    }

    setValidationState(prev => ({ ...prev, isSubmitting: true, globalError: '' }));

    try {
      const retryFn = enableRetry 
        ? validationUtils.createRetryMechanism(
            () => submitFn(formData),
            maxRetries,
            1000
          )
        : () => submitFn(formData);

      const result = await retryFn();
      
      setValidationState(prev => ({ ...prev, isSubmitting: false }));
      return { success: true, data: result };
    } catch (error: any) {
      const userFriendlyMessage = errorHandler.createUserFriendlyMessage(error);
      setValidationState(prev => ({ 
        ...prev, 
        isSubmitting: false, 
        globalError: userFriendlyMessage 
      }));
      
      errorHandler.logError(error, 'form submission');
      return { success: false, error: userFriendlyMessage };
    }
  }, [formData, validateForm, enableRetry, maxRetries, validationUtils, errorHandler]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(initialValues as T);
    setValidationState({
      isValid: false,
      isDirty: false,
      isSubmitting: false,
      hasErrors: false,
      fieldStates: {},
      globalError: ''
    });
  }, [initialValues]);

  // Clear global error
  const clearGlobalError = useCallback(() => {
    setValidationState(prev => ({ ...prev, globalError: '' }));
  }, []);

  // Update form data (for programmatic updates)
  const updateFormData = useCallback((newData: Partial<T>) => {
    setFormData(prev => ({ ...prev, ...newData }));
  }, []);

  // Get form errors summary
  const getFormErrorsSummary = useCallback((): string[] => {
    return validationUtils.getFormErrorsSummary(validationState.fieldStates);
  }, [validationState.fieldStates, validationUtils]);

  // Check if form is valid
  const isFormValid = useCallback((): boolean => {
    return validationUtils.isFormValid(validationState.fieldStates);
  }, [validationState.fieldStates, validationUtils]);

  // Progressive enhancement handler
  const handleProgressiveEnhancement = useCallback(
    (enhancedHandler: () => void, fallbackHandler: () => void) => {
      if (enableProgressiveEnhancement) {
        return validationUtils.createProgressiveEnhancement(enhancedHandler, fallbackHandler);
      }
      return enhancedHandler;
    },
    [enableProgressiveEnhancement, validationUtils]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Form data
    formData,
    updateFormData,
    
    // Validation state
    validationState,
    isFormValid: isFormValid(),
    hasErrors: validationState.hasErrors,
    isSubmitting: validationState.isSubmitting,
    globalError: validationState.globalError,
    
    // Field operations
    updateField,
    touchField,
    getFieldError,
    hasFieldError,
    isFieldValid,
    
    // Form operations
    validateForm,
    submitForm,
    resetForm,
    clearGlobalError,
    
    // Utilities
    getFormErrorsSummary,
    handleProgressiveEnhancement,
    
    // Validation utilities
    validationUtils,
    errorHandler
  };
}
