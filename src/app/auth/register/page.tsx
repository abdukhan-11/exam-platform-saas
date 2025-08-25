'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MainLayout } from '@/components/layout/main-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, UserPlus, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

function UserRegistrationForm() {
  const [activeTab, setActiveTab] = useState('student');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNo: '',
    password: '',
    confirmPassword: '',
    phone: '',
    department: '',
    year: '',
    semester: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: '',
    color: 'text-gray-400'
  });
  const [college, setCollege] = useState<{ id: string; name: string; username: string } | null>(null);
  
  const router = useRouter();

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

  // Password strength checker
  useEffect(() => {
    if (formData.password.length === 0) {
      setPasswordStrength({ score: 0, feedback: '', color: 'text-gray-400' });
      return;
    }

    let score = 0;
    let feedback = [];

    if (formData.password.length >= 8) score++;
    else feedback.push('At least 8 characters');

    if (/[a-z]/.test(formData.password)) score++;
    else feedback.push('Lowercase letter');

    if (/[A-Z]/.test(formData.password)) score++;
    else feedback.push('Uppercase letter');

    if (/[0-9]/.test(formData.password)) score++;
    else feedback.push('Number');

    if (/[^A-Za-z0-9]/.test(formData.password)) score++;
    else feedback.push('Special character');

    let color = 'text-red-500';
    if (score >= 4) color = 'text-green-500';
    else if (score >= 3) color = 'text-yellow-500';
    else if (score >= 2) color = 'text-orange-500';

    setPasswordStrength({
      score,
      feedback: feedback.join(', '),
      color
    });
  }, [formData.password]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setFormData({
      name: '',
      email: '',
      rollNo: '',
      password: '',
      confirmPassword: '',
      phone: '',
      department: '',
      year: '',
      semester: ''
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!college) {
      setError('Please select a college first');
      return;
    }

    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (activeTab === 'student' && !formData.rollNo.trim()) {
      setError('Roll number is required for students');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordStrength.score < 3) {
      setError('Please choose a stronger password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          role: activeTab.toUpperCase(),
          collegeUsername: college.username,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      setError('An error occurred during registration');
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
              <p className="text-gray-600 mb-6">
                Your account has been created successfully. You can now log in with your credentials.
              </p>
              <div className="space-y-3">
                <Button onClick={handleBackToLogin} className="w-full">
                  Continue to Login
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
            <CardTitle>Create Account at {college.name}</CardTitle>
            <CardDescription>
              Join our platform and start your educational journey
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

            {/* Registration Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="student">Student</TabsTrigger>
                <TabsTrigger value="teacher">Teacher</TabsTrigger>
              </TabsList>

              <TabsContent value="student" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="rollNo">Roll Number *</Label>
                      <Input
                        id="rollNo"
                        name="rollNo"
                        type="text"
                        placeholder="Enter roll number"
                        value={formData.rollNo}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <select
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Department</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Electrical Engineering">Electrical Engineering</option>
                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                        <option value="Civil Engineering">Civil Engineering</option>
                        <option value="Business Administration">Business Administration</option>
                        <option value="Arts">Arts</option>
                        <option value="Science">Science</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <select
                        id="year"
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Year</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </div>

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
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        className="pr-10"
                        aria-describedby="password-strength password-help"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`w-2 h-2 rounded-full ${
                                level <= passwordStrength.score
                                  ? passwordStrength.color.replace('text-', 'bg-')
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className={`text-xs ${passwordStrength.color}`}>
                          {passwordStrength.score === 0 && 'Very Weak'}
                          {passwordStrength.score === 1 && 'Weak'}
                          {passwordStrength.score === 2 && 'Fair'}
                          {passwordStrength.score === 3 && 'Good'}
                          {passwordStrength.score === 4 && 'Strong'}
                          {passwordStrength.score === 5 && 'Very Strong'}
                        </span>
                      </div>
                      {passwordStrength.feedback && (
                        <p className="text-xs text-gray-500" id="password-strength">
                          {passwordStrength.feedback}
                        </p>
                      )}
                      <p className="text-xs text-gray-500" id="password-help">
                        Password must be at least 8 characters long
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Account...
                      </>
                    ) : (
                      'Create Student Account'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="teacher" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="teacherName">Full Name *</Label>
                    <Input
                      id="teacherName"
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacherEmail">Email Address *</Label>
                    <Input
                      id="teacherEmail"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacherDepartment">Department</Label>
                    <select
                      id="teacherDepartment"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Department</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Business Administration">Business Administration</option>
                      <option value="Arts">Arts</option>
                      <option value="Science">Science</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacherPhone">Phone Number</Label>
                    <Input
                      id="teacherPhone"
                      name="phone"
                      type="tel"
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacherPassword">Password *</Label>
                    <div className="relative">
                      <Input
                        id="teacherPassword"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="teacherConfirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="teacherConfirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Account...
                      </>
                    ) : (
                      'Create Teacher Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <div className="text-center space-y-2 mt-6">
              <div className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserRegistrationForm />
    </Suspense>
  );
}
