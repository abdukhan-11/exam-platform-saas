'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorDisplay, SuccessDisplay } from '@/components/shared/error-display';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CollegeFormProps {
  initialData?: {
    id?: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    subscriptionTier?: 'free' | 'basic' | 'premium' | 'enterprise';
  };
  isEditing?: boolean;
}

interface ValidationErrors {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  subscriptionTier?: string;
  adminEmail?: string;
  adminName?: string;
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
    subscriptionTier: initialData?.subscriptionTier || 'free' as const,
    adminEmail: '',
    adminName: '',
    createAdmin: true,
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
        subscriptionTier: initialData.subscriptionTier || 'free',
        adminEmail: '',
        adminName: '',
        createAdmin: false, // Don't create admin when editing
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

    // Admin validation (only for new colleges)
    if (!isEditing && formData.createAdmin) {
      if (!formData.adminName.trim()) {
        errors.adminName = 'Admin name is required when creating admin user';
      }
      if (!formData.adminEmail.trim()) {
        errors.adminEmail = 'Admin email is required when creating admin user';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.adminEmail)) {
          errors.adminEmail = 'Please enter a valid admin email address';
        }
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

      const payload = {
        ...formData,
        // Only include admin data for new colleges
        ...(isEditing ? {} : {
          adminUser: formData.createAdmin ? {
            name: formData.adminName,
            email: formData.adminEmail,
          } : undefined
        })
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getFieldError = (field: keyof ValidationErrors) => {
    return validationErrors[field];
  };

  const isFieldInvalid = (field: keyof ValidationErrors) => {
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

          {/* Subscription Tier */}
          <div className="space-y-2">
            <Label htmlFor="subscriptionTier" className="text-sm font-medium">
              Subscription Tier <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.subscriptionTier}
              onValueChange={(value) => handleInputChange('subscriptionTier', value)}
              disabled={isLoading}
            >
              <SelectTrigger className={isFieldInvalid('subscriptionTier') ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select subscription tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            {getFieldError('subscriptionTier') && (
              <p className="text-sm text-red-500">{getFieldError('subscriptionTier')}</p>
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

          {/* Admin User Creation (only for new colleges) */}
          {!isEditing && (
            <>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="createAdmin"
                    checked={formData.createAdmin}
                    onChange={(e) => handleInputChange('createAdmin', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="createAdmin" className="text-sm font-medium">
                    Create Admin User
                  </Label>
                </div>
                <p className="text-sm text-gray-600">
                  Create an admin user for this college with full access to manage the institution.
                </p>
              </div>

              {formData.createAdmin && (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <h3 className="font-medium text-gray-900">Admin User Details</h3>
                  
                  {/* Admin Name */}
                  <div className="space-y-2">
                    <Label htmlFor="adminName" className="text-sm font-medium">
                      Admin Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="adminName"
                      type="text"
                      value={formData.adminName}
                      onChange={(e) => handleInputChange('adminName', e.target.value)}
                      className={isFieldInvalid('adminName') ? 'border-red-500' : ''}
                      placeholder="Enter admin full name"
                      disabled={isLoading}
                    />
                    {getFieldError('adminName') && (
                      <p className="text-sm text-red-500">{getFieldError('adminName')}</p>
                    )}
                  </div>

                  {/* Admin Email */}
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail" className="text-sm font-medium">
                      Admin Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                      className={isFieldInvalid('adminEmail') ? 'border-red-500' : ''}
                      placeholder="Enter admin email address"
                      disabled={isLoading}
                    />
                    {getFieldError('adminEmail') && (
                      <p className="text-sm text-red-500">{getFieldError('adminEmail')}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

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
