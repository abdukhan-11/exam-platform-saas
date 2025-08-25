import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MainLayout } from '@/components/layout/main-layout';

interface ErrorPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const { error } = await searchParams;
  const errorCode = error || 'unknown_error';
  
  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'middleware_error':
        return 'An error occurred while processing your request.';
      case 'access_denied':
        return 'Access was denied. Please check your permissions.';
      case 'verification':
        return 'The verification link is invalid or has expired.';
      case 'configuration':
        return 'There is a problem with the server configuration.';
      case 'default':
        return 'An unexpected error occurred.';
      default:
        return 'An error occurred during authentication.';
    }
  };

  return (
    <MainLayout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-destructive">Authentication Error</CardTitle>
            <CardDescription>
              {getErrorMessage(errorCode)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Please try again or contact support if the problem persists.
            </p>
            <div className="flex justify-center space-x-2">
              <Button variant="outline" asChild>
                <Link href="/">Go Home</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/login">Try Again</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
