'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorDisplay, SuccessDisplay } from '@/components/shared/error-display';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CollegeFormProps {
  initialData?: {
    id?: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  isEditing?: boolean;
}

interface ValidationErrors {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export default function CollegeForm({ initialData, isEditing = false }: CollegeFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    address: initialData?.address || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    website: initialData?.website || '',
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        address: initialData.address || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        website: initialData.website || '',
      });
    }
  }, [initialData]);

  // Clear validation errors when form data changes
  useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors({});
    }
  }, [formData]);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'College name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'College name must be at least 2 characters long';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'College name must be less than 100 characters';
    }

    // Address validation
    if (formData.address && formData.address.trim().length > 200) {
      errors.address = 'Address must be less than 200 characters';
    }

    // Phone validation
    if (formData.phone) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
        errors.phone = 'Please enter a valid phone number';
      }
    }

    // Email validation
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }

    // Website validation
    if (formData.website) {
      try {
        new URL(formData.website);
      } catch {
        errors.website = 'Please enter a valid URL (e.g., https://example.com)';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const url = isEditing 
        ? `/api/colleges/${initialData?.id}` 
        : '/api/colleges';
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          throw new Error(data.message || 'A college with this name already exists');
        } else if (response.status === 400) {
          throw new Error(data.message || 'Please check your input and try again');
        } else {
          throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} college`);
        }
      }

      setSuccess(`College ${isEditing ? 'updated' : 'created'} successfully!`);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard/superadmin/colleges');
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getFieldError = (field: keyof typeof formData) => {
    return validationErrors[field];
  };

  const isFieldInvalid = (field: keyof typeof formData) => {
    return !!getFieldError(field);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit College' : 'Create New College'}</CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Update the college information below.' 
            : 'Fill in the details to create a new college.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <SuccessDisplay
            message={success}
            onDismiss={() => setSuccess(null)}
          />
          
          <ErrorDisplay
            error={error}
            onDismiss={() => setError(null)}
            title={isEditing ? "Update Failed" : "Creation Failed"}
          />

          {/* College Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              College Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={isFieldInvalid('name') ? 'border-red-500' : ''}
              placeholder="Enter college name"
              disabled={isLoading}
            />
            {getFieldError('name') && (
              <p className="text-sm text-red-500">{getFieldError('name')}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium">
              Address
            </Label>
            <Input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className={isFieldInvalid('address') ? 'border-red-500' : ''}
              placeholder="Enter college address"
              disabled={isLoading}
            />
            {getFieldError('address') && (
              <p className="text-sm text-red-500">{getFieldError('address')}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={isFieldInvalid('phone') ? 'border-red-500' : ''}
              placeholder="Enter phone number"
              disabled={isLoading}
            />
            {getFieldError('phone') && (
              <p className="text-sm text-red-500">{getFieldError('phone')}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={isFieldInvalid('email') ? 'border-red-500' : ''}
              placeholder="Enter email address"
              disabled={isLoading}
            />
            {getFieldError('email') && (
              <p className="text-sm text-red-500">{getFieldError('email')}</p>
            )}
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="text-sm font-medium">
              Website
            </Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              className={isFieldInvalid('website') ? 'border-red-500' : ''}
              placeholder="https://example.com"
              disabled={isLoading}
            />
            {getFieldError('website') && (
              <p className="text-sm text-red-500">{getFieldError('website')}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update College' : 'Create College')
              }
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/superadmin/colleges')}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
