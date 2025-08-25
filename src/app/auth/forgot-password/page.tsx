'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MainLayout } from '@/components/layout/main-layout';
import { ArrowLeft, Building2, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [collegeUsername, setCollegeUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidatingCollege, setIsValidatingCollege] = useState(false);
  const [college, setCollege] = useState<{ id: string; name: string; username: string } | null>(null);
  const [collegeError, setCollegeError] = useState('');
  
  const router = useRouter();

  // Load college context from sessionStorage on component mount
  useEffect(() => {
    const storedCollege = sessionStorage.getItem('selectedCollege');
    if (storedCollege) {
      try {
        const collegeData = JSON.parse(storedCollege);
        setCollege(collegeData);
        setCollegeUsername(collegeData.username);
      } catch (error) {
        console.error('Failed to parse stored college data:', error);
        sessionStorage.removeItem('selectedCollege');
      }
    }
  }, []);

  const validateCollege = async () => {
    if (!collegeUsername.trim()) {
      setCollegeError('College username is required');
      return false;
    }

    setIsValidatingCollege(true);
    setCollegeError('');

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
        setCollegeError('');
        return true;
      } else {
        setCollegeError(data.error || 'College not found');
        setCollege(null);
        return false;
      }
    } catch (error) {
      setCollegeError('Failed to validate college');
      setCollege(null);
      return false;
    } finally {
      setIsValidatingCollege(false);
    }
  };

  const handleCollegeValidation = async () => {
    await validateCollege();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!college) {
      setError('Please select a college first');
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          collegeUsername: college.username,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToCollegeSelection = () => {
    sessionStorage.removeItem('selectedCollege');
    router.push('/');
  };

  const handleBackToLogin = () => {
    router.push('/auth/login');
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to <strong>{email}</strong>. 
                Please check your email and follow the instructions to reset your password.
              </p>
              <div className="space-y-3">
                <Button onClick={handleBackToLogin} className="w-full">
                  Back to Login
                </Button>
                <Button onClick={handleBackToCollegeSelection} variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Change College
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
      <div className="container mx-auto flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2 mb-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">Password Reset</span>
            </div>
            <CardTitle>Forgot Your Password?</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* College Selection */}
            <div className="mb-6">
              <Label htmlFor="collegeUsername">College Username</Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  id="collegeUsername"
                  type="text"
                  placeholder="Enter college username"
                  value={collegeUsername}
                  onChange={(e) => setCollegeUsername(e.target.value)}
                  disabled={isValidatingCollege || isLoading}
                  className="flex-1"
                  aria-describedby="college-error"
                />
                <Button
                  type="button"
                  onClick={handleCollegeValidation}
                  disabled={!collegeUsername.trim() || isValidatingCollege || isLoading}
                  variant="outline"
                  aria-label="Validate college username"
                >
                  {isValidatingCollege ? 'Validating...' : 'Validate'}
                </Button>
              </div>
              {collegeError && (
                <Alert variant="destructive" className="py-2 mt-2" id="college-error">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{collegeError}</AlertDescription>
                </Alert>
              )}
              {college && (
                <Alert className="py-2 mt-2 bg-green-50 border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    ✓ {college.name} - Ready to proceed
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Password Reset Form */}
            {college && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    aria-describedby="email-help"
                  />
                  <p id="email-help" className="text-xs text-gray-500">
                    Enter the email address associated with your account
                  </p>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending Reset Link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            )}

            {/* Navigation Links */}
            <div className="text-center space-y-2 mt-6">
              <Link
                href="/auth/login"
                className="text-sm text-primary hover:underline"
              >
                ← Back to Login
              </Link>
              
              <div className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/auth/register" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>

              {!college && (
                <Button 
                  onClick={handleBackToCollegeSelection} 
                  variant="outline" 
                  className="w-full mt-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to College Selection
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
