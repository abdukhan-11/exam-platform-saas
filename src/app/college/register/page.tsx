'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MainLayout } from '@/components/layout/main-layout';
import { ArrowLeft, Building2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

function CollegeRegistrationForm() {
  const [formData, setFormData] = useState({
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.username || !formData.email || !formData.contactPerson) {
      setError('Please fill in all required fields');
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
        <div className="container mx-auto flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
              <p className="text-gray-600 mb-6">
                Your college "{formData.name}" has been successfully registered with username "{formData.username}".
              </p>
              <div className="space-y-3">
                <Button onClick={handleContinueToLogin} className="w-full">
                  Continue to Login
                </Button>
                <Button onClick={handleBackToHome} variant="outline" className="w-full">
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Building2 className="w-16 h-16 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Register Your Institution</h1>
            <p className="text-lg text-gray-600">
              Join our multi-tenant examination platform and start managing exams efficiently
            </p>
          </div>

          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>College Information</CardTitle>
              <CardDescription>
                Please provide the details of your educational institution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Basic Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Institution Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter institution name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Choose a unique username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500">
                      This will be used by your users to access the platform
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Contact Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter contact email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      name="contactPerson"
                      type="text"
                      placeholder="Enter contact person name"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      placeholder="Enter website URL"
                      value={formData.website}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="Enter city"
                      value={formData.city}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      name="state"
                      type="text"
                      placeholder="Enter state"
                      value={formData.state}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      type="text"
                      placeholder="Enter country"
                      value={formData.country}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Full Address</Label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="Enter full address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="Brief description of your institution"
                    value={formData.description}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-center">
                  <Button type="submit" size="lg" disabled={isLoading}>
                    {isLoading ? 'Registering...' : 'Register Institution'}
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

