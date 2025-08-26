'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RecoverAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid recovery link');
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/auth/recover-account?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid recovery link');
      }

      setValidToken(true);
      setEmail(data.email);
      setName(data.name);
      setExpiresAt(new Date(data.expiresAt));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid recovery link');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/recover-account', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to recover account');
      }

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/signin?message=Account recovered successfully. Please sign in.');
      }, 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to recover account');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Validating recovery link...</span>
        </div>
      </div>
    );
  }

  if (error && !validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Invalid Recovery Link</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/auth/forgot-password')}
              className="w-full"
            >
              Request New Recovery Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Account Recovered!</CardTitle>
            <CardDescription>
              Your account has been successfully recovered. You will be redirected to the sign-in page shortly.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recover Account</CardTitle>
          <CardDescription>
            Your account has been deactivated. Click the button below to recover it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Account Details:</p>
                  <p><strong>Name:</strong> {name}</p>
                  <p><strong>Email:</strong> {email}</p>
                  {expiresAt && (
                    <p><strong>Link expires:</strong> {expiresAt.toLocaleString()}</p>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertDescription>
                <strong>What happens when you recover your account:</strong>
                <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                  <li>Your account will be reactivated</li>
                  <li>You'll be able to sign in again</li>
                  <li>All your data and settings will be restored</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleRecover}
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recovering Account...
                </>
              ) : (
                'Recover My Account'
              )}
            </Button>

            <div className="text-center">
              <Button variant="link" asChild>
                <Link href="/auth/signin">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
