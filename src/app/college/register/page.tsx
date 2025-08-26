'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MainLayout } from '@/components/layout/main-layout';
import { ArrowLeft, Building2, CheckCircle, Loader2, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useUsernameAvailability } from '@/hooks/useUsernameAvailability';
import { useFormValidation } from '@/hooks/useFormValidation';
import { CollegeRegistrationFormData } from '@/lib/validation/college-schemas';

function CollegeRegistrationForm() {
  const [formData, setFormData] = useState<CollegeRegistrationFormData>({
    name: '',
    username: '',
    email: '',
    contactPerson: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    website: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  
  // Form validation and username availability hooks
  const {
    validateForm,
    setFieldTouched,
    getFieldError,
    hasFieldError,
    resetValidation
  } = useFormValidation();
  
  const usernameCheck = useUsernameAvailability(formData.username);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Mark field as touched for validation
    setFieldTouched(name as keyof CollegeRegistrationFormData);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    setFieldTouched(name as keyof CollegeRegistrationFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const isFormValid = validateForm(formData);
    
    // Check username availability
    if (!usernameCheck.available && formData.username.length >= 3) {
      setError('Username is not available. Please choose a different username.');
      return;
    }
    
    if (!isFormValid) {
      setError('Please fix the validation errors before submitting.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/colleges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Store college context for immediate use
        sessionStorage.setItem('selectedCollege', JSON.stringify({
          id: data.college.id,
          name: data.college.name,
          username: data.college.username
        }));
      } else {
        setError(data.error || 'Failed to register college');
      }
    } catch (error) {
      setError('An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueToLogin = () => {
    router.push('/auth/login');
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  if (success) {
    return (
      <MainLayout>
        <div className="container mx-auto flex items-center justify-center min-h-[60vh] px-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center px-4 sm:px-6">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Your college "{formData.name}" has been successfully registered with username "{formData.username}".
              </p>
              <div className="space-y-3">
                <Button onClick={handleContinueToLogin} className="w-full h-11 sm:h-12 text-sm sm:text-base">
                  Continue to Login
                </Button>
                <Button onClick={handleBackToHome} variant="outline" className="w-full h-11 sm:h-12 text-sm sm:text-base">
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-4">
              <Building2 className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 px-4">Register Your Institution</h1>
            <p className="text-base sm:text-lg text-gray-600 px-4">
              Join our multi-tenant examination platform and start managing exams efficiently
            </p>
          </div>

          {/* Registration Form */}
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">College Information</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Please provide the details of your educational institution
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Basic Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm sm:text-base">Institution Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter institution name"
                      value={formData.name}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      required
                      disabled={isLoading}
                      className={`h-11 sm:h-12 text-sm sm:text-base ${hasFieldError('name') ? 'border-red-500' : ''}`}
                    />
                    {hasFieldError('name') && (
                      <p className="text-xs sm:text-sm text-red-600">{getFieldError('name')}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm sm:text-base">Username *</Label>
                    <div className="relative">
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        placeholder="Choose a unique username"
                        value={formData.username}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        required
                        disabled={isLoading}
                        className={`h-11 sm:h-12 text-sm sm:text-base pr-10 ${hasFieldError('username') ? 'border-red-500' : ''}`}
                      />
                      {formData.username.length >= 3 && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {usernameCheck.loading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          ) : usernameCheck.available ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      This will be used by your users to access the platform
                    </p>
                    {hasFieldError('username') && (
                      <p className="text-xs sm:text-sm text-red-600">{getFieldError('username')}</p>
                    )}
                    {formData.username.length >= 3 && !usernameCheck.loading && (
                      <p className={`text-xs sm:text-sm ${usernameCheck.available ? 'text-green-600' : 'text-red-600'}`}>
                        {usernameCheck.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm sm:text-base">Contact Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter contact email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      required
                      disabled={isLoading}
                      className={`h-11 sm:h-12 text-sm sm:text-base ${hasFieldError('email') ? 'border-red-500' : ''}`}
                    />
                    {hasFieldError('email') && (
                      <p className="text-xs sm:text-sm text-red-600">{getFieldError('email')}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson" className="text-sm sm:text-base">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      name="contactPerson"
                      type="text"
                      placeholder="Enter contact person name"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      required
                      disabled={isLoading}
                      className={`h-11 sm:h-12 text-sm sm:text-base ${hasFieldError('contactPerson') ? 'border-red-500' : ''}`}
                    />
                    {hasFieldError('contactPerson') && (
                      <p className="text-xs sm:text-sm text-red-600">{getFieldError('contactPerson')}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm sm:text-base">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="Enter phone number"
                      value={formData.phone || ''}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      disabled={isLoading}
                      className={`h-11 sm:h-12 text-sm sm:text-base ${hasFieldError('phone') ? 'border-red-500' : ''}`}
                    />
                    {hasFieldError('phone') && (
                      <p className="text-xs sm:text-sm text-red-600">{getFieldError('phone')}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-sm sm:text-base">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      placeholder="Enter website URL"
                      value={formData.website || ''}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      disabled={isLoading}
                      className={`h-11 sm:h-12 text-sm sm:text-base ${hasFieldError('website') ? 'border-red-500' : ''}`}
                    />
                    {hasFieldError('website') && (
                      <p className="text-xs sm:text-sm text-red-600">{getFieldError('website')}</p>
                    )}
                  </div>
                </div>

                {/* Address Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm sm:text-base">City</Label>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="Enter city"
                      value={formData.city || ''}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      disabled={isLoading}
                      className={`h-11 sm:h-12 text-sm sm:text-base ${hasFieldError('city') ? 'border-red-500' : ''}`}
                    />
                    {hasFieldError('city') && (
                      <p className="text-xs sm:text-sm text-red-600">{getFieldError('city')}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm sm:text-base">State/Province</Label>
                    <Input
                      id="state"
                      name="state"
                      type="text"
                      placeholder="Enter state"
                      value={formData.state || ''}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      disabled={isLoading}
                      className={`h-11 sm:h-12 text-sm sm:text-base ${hasFieldError('state') ? 'border-red-500' : ''}`}
                    />
                    {hasFieldError('state') && (
                      <p className="text-xs sm:text-sm text-red-600">{getFieldError('state')}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                    <Label htmlFor="country" className="text-sm sm:text-base">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      type="text"
                      placeholder="Enter country"
                      value={formData.country || ''}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      disabled={isLoading}
                      className={`h-11 sm:h-12 text-sm sm:text-base ${hasFieldError('country') ? 'border-red-500' : ''}`}
                    />
                    {hasFieldError('country') && (
                      <p className="text-xs sm:text-sm text-red-600">{getFieldError('country')}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm sm:text-base">Full Address</Label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="Enter full address"
                    value={formData.address || ''}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    disabled={isLoading}
                    className={`h-11 sm:h-12 text-sm sm:text-base ${hasFieldError('address') ? 'border-red-500' : ''}`}
                  />
                  {hasFieldError('address') && (
                    <p className="text-xs sm:text-sm text-red-600">{getFieldError('address')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm sm:text-base">Description</Label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="Brief description of your institution"
                    value={formData.description || ''}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    disabled={isLoading}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base ${hasFieldError('description') ? 'border-red-500' : ''}`}
                  />
                  {hasFieldError('description') && (
                    <p className="text-xs sm:text-sm text-red-600">{getFieldError('description')}</p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-4">
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={
                      isLoading || 
                      !usernameCheck.available || 
                      usernameCheck.loading ||
                      !formData.name || 
                      !formData.username || 
                      !formData.email || 
                      !formData.contactPerson
                    }
                    className="w-full sm:w-auto h-12 sm:h-14 text-base sm:text-lg font-semibold px-8 sm:px-12"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      'Register Institution'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Back to Home */}
          <div className="text-center mt-6">
            <Button onClick={handleBackToHome} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function CollegeRegistrationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CollegeRegistrationForm />
    </Suspense>
  );
}

