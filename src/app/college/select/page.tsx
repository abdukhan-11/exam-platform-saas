'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Building2, GraduationCap, User } from 'lucide-react';

export default function CollegeSelectionPage() {
  const [collegeUsername, setCollegeUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [college, setCollege] = useState<any>(null);
  const router = useRouter();

  const handleCollegeSearch = async () => {
    if (!collegeUsername.trim()) {
      setError('Please enter a college username');
      return;
    }

    setIsLoading(true);
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
                <Input
                  id="collegeUsername"
                  type="text"
                  placeholder="e.g., greenfield_college"
                  value={collegeUsername}
                  onChange={(e) => setCollegeUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCollegeSearch()}
                />
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleCollegeSearch} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Searching...' : 'Find College'}
              </Button>
            </CardContent>
          </Card>

          {/* College Found - Login Options */}
          {college && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">
                  ✓ College Found: {college.name}
                </CardTitle>
                <CardDescription>
                  Choose how you want to access the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleLoginChoice('admin')}
                    className="h-20 flex flex-col items-center justify-center space-y-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <User className="w-6 h-6" />
                    <span>Login as Admin/Teacher</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleLoginChoice('student')}
                    className="h-20 flex flex-col items-center justify-center space-y-2 bg-green-600 hover:bg-green-700"
                  >
                    <GraduationCap className="w-6 h-6" />
                    <span>Login as Student</span>
                  </Button>
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
