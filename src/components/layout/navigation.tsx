'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function Navigation() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/');
  };

  const handleSignIn = () => {
    router.push('/auth/login');
  };

  const handleSignUp = () => {
    router.push('/college/register');
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold">Exam SaaS</span>
            </Link>
          </div>

          <div className="items-center space-x-6 md:flex">
            <Link
              href="/dashboard"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
            <Link
              href="/marketing"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Marketing
            </Link>
            <Link
              href="/button-demo"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Button Demo
            </Link>
            <Link
              href="/input-demo"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Input Demo
            </Link>
            <Link
              href="/card-demo"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Card Demo
            </Link>
            <Link
              href="/alert-demo"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Alert Demo
            </Link>
            <Link
              href="/dialog-demo"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Dialog Demo
            </Link>
            <Link
              href="/theme-test"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Theme Test
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSignIn}
            >
              Sign In
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSignUp}
            >
              Sign Up
            </Button>
            <Button 
              size="sm"
              onClick={handleGetStarted}
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
