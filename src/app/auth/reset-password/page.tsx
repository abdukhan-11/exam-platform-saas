'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MainLayout } from '@/components/layout/main-layout';
import { ArrowLeft, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token, email]);

  // Password strength checker
  useEffect(() => {
    if (password.length === 0) {
      setPasswordStrength({ score: 0, feedback: '', color: 'text-gray-400' });
      return;
    }

    let score = 0;
    let feedback = [];

    if (password.length >= 8) score++;
    else feedback.push('At least 8 characters');

    if (/[a-z]/.test(password)) score++;
    else feedback.push('Lowercase letter');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Uppercase letter');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('Number');

    if (/[^A-Za-z0-9]/.test(password)) score++;
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
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !email) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
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
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h2>
              <p className="text-gray-600 mb-6">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
              <Button onClick={handleBackToLogin} className="w-full">
                Continue to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!token || !email) {
    return (
      <MainLayout>
        <div className="container mx-auto flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Invalid reset link. Please request a new password reset.
                </AlertDescription>
              </Alert>
              <Button onClick={handleBackToLogin} className="w-full mt-4">
                Back to Login
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
              <Lock className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">Password Reset</span>
            </div>
            <CardTitle>Set New Password</CardTitle>
            <CardDescription>
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-10"
                    aria-describedby="confirm-help"
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
                <p className="text-xs text-gray-500" id="confirm-help">
                  Re-enter your new password to confirm
                </p>
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
            
            <div className="text-center mt-6">
              <Link
                href="/auth/login"
                className="text-sm text-primary hover:underline"
              >
                ← Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
