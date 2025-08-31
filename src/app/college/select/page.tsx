'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Building2, GraduationCap, User, Loader2, Check, X } from 'lucide-react';

export default function CollegeSelectionPage() {
  const [collegeUsername, setCollegeUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [college, setCollege] = useState<any>(null);
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const router = useRouter();

  // Real-time validation for college username
  const validateUsername = useCallback((username: string) => {
    if (!username) {
      setValidationError('');
      return;
    }
    
    if (username.length < 3) {
      setValidationError('Username must be at least 3 characters');
      return;
    }
    
    if (username.length > 50) {
      setValidationError('Username must be no more than 50 characters');
      return;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setValidationError('Username can only contain letters, numbers, hyphens, and underscores');
      return;
    }
    
    setValidationError('');
  }, []);

  // Debounced validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateUsername(collegeUsername);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [collegeUsername, validateUsername]);

  const handleCollegeSearch = async () => {
    if (!collegeUsername.trim()) {
      setError('Please enter a college username');
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    setCollege(null);

    try {
      const response = await fetch('/api/auth/resolve-college', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collegeUsername: collegeUsername.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setCollege(data.college);
        setError('');
      } else {
        setError(data.error || 'College not found');
        setCollege(null);
      }
    } catch (err) {
      setError('Failed to connect to server');
      setCollege(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginChoice = (role: 'admin' | 'student') => {
    if (college) {
      // Store college context in session storage for the login flow
      sessionStorage.setItem('selectedCollege', JSON.stringify(college));
      
      if (role === 'admin') {
        router.push(`/auth/login?college=${college.username}`);
      } else {
        router.push(`/auth/login-student?college=${college.username}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-blue-600 hover:text-blue-700">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="text-xl font-bold text-gray-900">ExamPlatform</span>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to ExamPlatform
            </h1>
            <p className="text-gray-600">
              Enter your college username to get started with secure online examinations
            </p>
          </div>

          {/* College Search Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Find Your College</span>
              </CardTitle>
              <CardDescription>
                Enter the username of your educational institution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="collegeUsername">College Username</Label>
                <div className="relative">
                  <Input
                    id="collegeUsername"
                    type="text"
                    placeholder="e.g., greenfield_college"
                    value={collegeUsername}
                    onChange={(e) => setCollegeUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !validationError && handleCollegeSearch()}
                    className={`pr-10 ${validationError ? 'border-red-500' : ''} ${college ? 'border-green-500' : ''}`}
                    disabled={isLoading}
                    data-testid="college-username"
                  />
                  {collegeUsername.length >= 3 && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : college ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : validationError ? (
                        <X className="w-4 h-4 text-red-600" />
                      ) : null}
                    </div>
                  )}
                </div>
                {validationError && (
                  <p className="text-sm text-red-600">{validationError}</p>
                )}
                {college && (
                  <p className="text-sm text-green-600">✓ College found and ready to proceed</p>
                )}
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleCollegeSearch} 
                disabled={isLoading || !!validationError || !collegeUsername.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  'Find College'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* College Found - Login Options */}
          {college && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center space-x-2">
                  <Check className="w-5 h-5" />
                  <span>{`✓ College Found: ${college.name}`}</span>
                </CardTitle>
                <CardDescription>
                  Choose how you want to access the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleLoginChoice('admin')}
                    className="h-20 flex flex-col items-center justify-center space-y-2 bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <User className="w-6 h-6" />
                    <span>Login as Admin/Teacher</span>
                    <span className="text-xs opacity-90">Manage exams and students</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleLoginChoice('student')}
                    className="h-20 flex flex-col items-center justify-center space-y-2 bg-green-600 hover:bg-green-700 transition-colors"
                  >
                    <GraduationCap className="w-6 h-6" />
                    <span>Login as Student</span>
                    <span className="text-xs opacity-90">Take exams and view results</span>
                  </Button>
                </div>
                
                <div className="text-center pt-4 border-t border-green-200">
                  <p className="text-sm text-gray-600">
                    Wrong college? <button 
                      onClick={() => {
                        setCollege(null);
                        setCollegeUsername('');
                        setError('');
                        setValidationError('');
                      }}
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      Search again
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* New College Registration */}
          <div className="text-center mt-8">
            <p className="text-gray-600 mb-4">
              Don't see your college? Register a new institution
            </p>
            <Link href="/college/register">
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                Register New College
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
