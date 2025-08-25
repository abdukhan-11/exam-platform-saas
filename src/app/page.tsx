'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MainLayout } from '@/components/layout/main-layout';
import { Building2, GraduationCap, Users, Shield } from 'lucide-react';

function CollegeSelectionForm() {
  const [collegeUsername, setCollegeUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidatingCollege, setIsValidatingCollege] = useState(false);
  const [college, setCollege] = useState<{ id: string; name: string; username: string } | null>(null);
  
  const router = useRouter();

  const validateCollege = async () => {
    if (!collegeUsername.trim()) {
      setError('College username is required');
      return;
    }

    setIsValidatingCollege(true);
    setError('');

    try {
      const response = await fetch('/api/auth/resolve-college', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collegeUsername: collegeUsername.trim() }),
      });

      const data = await response.json();

      if (data.success && data.college) {
        setCollege(data.college);
        setError('');
      } else {
        setError(data.error || 'College not found');
        setCollege(null);
      }
    } catch (error) {
      setError('Failed to validate college');
      setCollege(null);
    } finally {
      setIsValidatingCollege(false);
    }
  };

  const handleCollegeValidation = async () => {
    await validateCollege();
  };

  const handleContinue = () => {
    if (college) {
      // Store college data in sessionStorage
      sessionStorage.setItem('selectedCollege', JSON.stringify(college));
      
      // Navigate to login page
      router.push('/auth/login');
    }
  };

  const handleCollegeRegistration = () => {
    router.push('/college/register');
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Exam SaaS Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Select your institution to get started with secure, multi-tenant exam management
          </p>
        </div>

        {/* College Selection Form */}
        <div className="max-w-md mx-auto mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Select Your Institution</CardTitle>
              <CardDescription className="text-center">
                Enter your college username to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="collegeUsername">College Username</Label>
                <div className="flex space-x-2">
                  <Input
                    id="collegeUsername"
                    type="text"
                    placeholder="Enter college username"
                    value={collegeUsername}
                    onChange={(e) => setCollegeUsername(e.target.value)}
                    disabled={isValidatingCollege || isLoading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleCollegeValidation}
                    disabled={!collegeUsername.trim() || isValidatingCollege || isLoading}
                    variant="outline"
                  >
                    {isValidatingCollege ? 'Validating...' : 'Validate'}
                  </Button>
                </div>
              </div>

              {college && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">
                    ✓ {college.name} - Ready to proceed
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Button
                  onClick={handleContinue}
                  disabled={!college || isLoading}
                  className="w-full"
                >
                  Continue to Login
                </Button>
                
                <Button
                  onClick={handleCollegeRegistration}
                  variant="outline"
                  className="w-full"
                >
                  Register New Institution
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Showcase */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <GraduationCap className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Exam Management</h3>
            <p className="text-gray-600">Create, schedule, and manage comprehensive examinations</p>
          </div>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Users className="h-12 w-12 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Role-Based Access</h3>
            <p className="text-gray-600">Secure access control for admins, teachers, and students</p>
          </div>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Anti-Cheating</h3>
            <p className="text-gray-600">Advanced security features to maintain exam integrity</p>
          </div>
        </div>

        {/* Quick Access */}
        {!college && (
          <div className="text-center">
            <div className="text-center text-sm text-gray-600">
              Or go directly to:
            </div>
            
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mt-3">
              <Button
                onClick={() => router.push('/auth/login')}
                variant="outline"
                className="w-full"
              >
                Admin/Teacher Login
              </Button>
              
              <Button
                onClick={() => router.push('/auth/login-student')}
                variant="outline"
                className="w-full"
              >
                Student Login
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p className="text-sm mb-2">
            <strong>Need help?</strong> Contact our support team or check our documentation.
          </p>
          <p className="text-sm">
            Platform version: 1.0.0 | Last updated: August 2025
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

export default function HomePage() {
  return <CollegeSelectionForm />;
}
