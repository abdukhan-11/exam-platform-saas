'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

function SuperAdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard/superadmin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      if (!email || !password) {
        setError('Email and password are required');
        return;
      }

      const result = await signIn('super-admin', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials');
      } else if (result?.ok) {
        router.push(callbackUrl);
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto flex items-center justify-center min-h-[60vh] px-4 py-6">
        <Card className="w-full max-w-md">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">Super Admin Sign In</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Enter your credentials to access the Super Admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="sa-email" className="text-sm sm:text-base">Email</Label>
                <Input
                  id="sa-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sa-password" className="text-sm sm:text-base">Password</Label>
                <Input
                  id="sa-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>

              <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In as Super Admin'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuperAdminLoginForm />
    </Suspense>
  );
}


