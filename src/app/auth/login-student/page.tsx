'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MainLayout } from '@/components/layout/main-layout';
import { ArrowLeft, Building2 } from 'lucide-react';

function StudentLoginForm() {
  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [college, setCollege] = useState<{ id: string; name: string; username: string } | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard/student';

  // Load college context from sessionStorage on component mount
  useEffect(() => {
    const storedCollege = sessionStorage.getItem('selectedCollege');
    if (storedCollege) {
      try {
        const collegeData = JSON.parse(storedCollege);
        setCollege(collegeData);
      } catch (error) {
        console.error('Failed to parse stored college data:', error);
        sessionStorage.removeItem('selectedCollege');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!college) {
      setError('Please select a college first');
      return;
    }

    if (!rollNo || !password) {
      setError('Roll number and password are required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('student', {
        rollNo,
        password,
        collegeUsername: college.username,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid roll number or password');
      } else if (result?.ok) {
        router.push(callbackUrl);
      }
    } catch (error) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToCollegeSelection = () => {
    sessionStorage.removeItem('selectedCollege');
    router.push('/');
  };

  // If no college is selected, redirect to home
  if (!college) {
    return (
      <MainLayout>
        <div className="container mx-auto flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <Alert>
                <AlertDescription>
                  No college selected. Please go back to select your institution.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={handleBackToCollegeSelection} 
                className="mt-4 w-full"
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to College Selection
              </Button>
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
              <Building2 className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">{college.username}</span>
            </div>
            <CardTitle>Student Sign In to {college.name}</CardTitle>
            <CardDescription>
              Enter your student credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* College Info Display */}
            <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">{college.name}</p>
                  <p className="text-xs text-blue-700">@{college.username}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToCollegeSelection}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Change
                </Button>
              </div>
            </div>

            {/* Student Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="rollNo">Roll Number</Label>
                <Input
                  id="rollNo"
                  type="text"
                  placeholder="Enter your roll number"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
            
            <div className="text-center space-y-2 mt-6">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot your password?
              </Link>
              
              <div className="text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/auth/register" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Are you a teacher or admin?{' '}
                <Link href="/auth/login" className="text-primary hover:underline">
                  Sign in here
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function StudentLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudentLoginForm />
    </Suspense>
  );
}
