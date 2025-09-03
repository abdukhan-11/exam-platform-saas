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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2 } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('admin-teacher');
  const [college, setCollege] = useState<{ id: string; name: string; username: string } | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

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
    
    // Super Admin does not require college context
    if (!college && activeTab !== 'super-admin') {
      setError('Please select a college first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let result;
      
      if (activeTab === 'admin-teacher') {
        if (!email || !password) {
          setError('Email and password are required');
          return;
        }
        
        result = await signIn('admin-teacher', {
          email,
          password,
          collegeUsername: college!.username,
          redirect: false,
        });
      } else if (activeTab === 'student') {
        if (!rollNo || !password) {
          setError('Roll number and password are required');
          return;
        }
        
        result = await signIn('student', {
          rollNo,
          password,
          collegeUsername: college!.username,
          redirect: false,
        });
      } else if (activeTab === 'super-admin') {
        if (!email || !password) {
          setError('Email and password are required');
          return;
        }

        result = await signIn('super-admin', {
          email,
          password,
          redirect: false,
        });
      } else {
        setError('Invalid authentication method');
        return;
      }

      if (result?.error) {
        setError('Invalid credentials');
      } else if (result?.ok) {
        // Get the proper redirect URL based on user role
        try {
          const response = await fetch('/api/auth/get-redirect-url');
          if (response.ok) {
            const data = await response.json();
            router.push(data.redirectUrl);
          } else {
            // Fallback to default redirect based on authentication method
            let redirectUrl = '/dashboard';
            
            if (activeTab === 'admin-teacher') {
              redirectUrl = '/dashboard/college-admin';
            } else if (activeTab === 'student') {
              redirectUrl = '/dashboard/student';
            } else if (activeTab === 'super-admin') {
              redirectUrl = '/dashboard/superadmin';
            }
            
            router.push(redirectUrl);
          }
        } catch (error) {
          console.error('Error getting redirect URL:', error);
          // Fallback to default redirect
          router.push('/dashboard');
        }
      }
    } catch (error) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setEmail('');
    setRollNo('');
    setPassword('');
    setError('');
  };

  const handleBackToCollegeSelection = () => {
    sessionStorage.removeItem('selectedCollege');
    router.push('/');
  };

  // If no college is selected, block access here (super admin has a dedicated route)
  if (!college) {
    return (
      <MainLayout>
        <div className="container mx-auto flex items-center justify-center min-h-[60vh] px-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center px-4 sm:px-6">
              <Alert>
                <AlertDescription className="text-sm sm:text-base">
                  No college selected. Please go back to select your institution.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={handleBackToCollegeSelection} 
                className="mt-4 w-full h-11 sm:h-12 text-sm sm:text-base"
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
      <div className="container mx-auto flex items-center justify-center min-h-[60vh] px-4 py-6">
        <Card className="w-full max-w-md">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-center space-x-2 mb-2">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <span className="text-xs sm:text-sm text-blue-600 font-medium">{college.username}</span>
            </div>
            <CardTitle className="text-lg sm:text-xl">Sign In to {college.name}</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {/* College Info Display (not needed for Super Admin) */}
            {activeTab !== 'super-admin' && college && (
              <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900 truncate">{college.name}</p>
                    <p className="text-xs text-blue-700">@{college.username}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToCollegeSelection}
                    className="text-blue-600 hover:text-blue-800 flex-shrink-0 ml-2"
                  >
                    <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Change</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Authentication Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="admin-teacher">Admin/Teacher</TabsTrigger>
                <TabsTrigger value="student">Student</TabsTrigger>
              </TabsList>

              <TabsContent value="admin-teacher" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-sm">{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 sm:h-12 text-sm sm:text-base"
                      data-testid="email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 sm:h-12 text-sm sm:text-base"
                      data-testid="password"
                    />
                  </div>
                  
                  <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={isLoading}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="student" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-sm">{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="rollNo" className="text-sm sm:text-base">Roll Number</Label>
                    <Input
                      id="rollNo"
                      type="text"
                      placeholder="Enter your roll number"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 sm:h-12 text-sm sm:text-base"
                      data-testid="roll-no"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="studentPassword" className="text-sm sm:text-base">Password</Label>
                    <Input
                      id="studentPassword"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 sm:h-12 text-sm sm:text-base"
                      data-testid="student-password"
                    />
                  </div>
                  
                  <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={isLoading}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

            </Tabs>
            
            <div className="text-center space-y-2 mt-6">
              <Link
                href="/auth/forgot-password"
                className="text-xs sm:text-sm text-primary hover:underline"
              >
                Forgot your password?
              </Link>
              
              <div className="text-xs sm:text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/auth/register" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
