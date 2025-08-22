'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MainLayout } from '@/components/layout/main-layout';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically sign out when the page loads
    signOut({ 
      redirect: false,
      callbackUrl: '/'
    });
  }, []);

  const handleSignOut = async () => {
    await signOut({ 
      redirect: true,
      callbackUrl: '/'
    });
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <MainLayout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sign Out</CardTitle>
            <CardDescription>
              Are you sure you want to sign out?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              You will be redirected to the home page after signing out.
            </p>
            <div className="flex justify-center space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
