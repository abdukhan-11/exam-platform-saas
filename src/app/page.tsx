import Link from 'next/link';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MainLayout } from '@/components/layout/main-layout';

export default function Home() {
  return (
    <MainLayout>
      <div className="space-y-12">
        {/* Hero Section */}
        <section className="space-y-6 py-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Welcome to <span className="text-primary">Exam SaaS</span>
          </h1>
          <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
            A comprehensive platform for creating, managing, and taking online
            examinations. Built with modern technologies and beautiful UI
            components.
          </p>
          <div className="flex justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/dashboard">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/marketing">Learn More</Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="space-y-8">
          <h2 className="center text-3xl font-bold">Platform Features</h2>
          <div className="gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Modern UI Components</CardTitle>
                <CardDescription>
                  Built with shadcn/ui and Tailwind CSS for a beautiful,
                  responsive design
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Explore our component library with demo pages showcasing
                  Button, Input, Card, Alert, and Dialog components.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>TypeScript Support</CardTitle>
                <CardDescription>
                  Full TypeScript integration for better development experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Type-safe development with proper type definitions and
                  IntelliSense support.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Responsive Design</CardTitle>
                <CardDescription>
                  Mobile-first approach with Tailwind CSS utilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Optimized for all devices with responsive breakpoints and
                  mobile-friendly navigation.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Component Showcase */}
        <section className="space-y-8">
          <h2 className="center text-3xl font-bold">Component Showcase</h2>
          <div className="gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Interactive Components</CardTitle>
                <CardDescription>Test our UI components</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button>Primary Button</Button>
                  <Button variant="outline">Outline Button</Button>
                </div>
                <Input placeholder="Enter your email" />
                <Alert>
                  <AlertDescription>
                    This is an example alert component with custom styling.
                  </AlertDescription>
                </Alert>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary">Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Example Dialog</DialogTitle>
                      <DialogDescription>
                        This is an example dialog component. You can customize
                        it with any content.
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Demo Pages</CardTitle>
                <CardDescription>Explore our component demos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/button-demo">Button Demo</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/input-demo">Input Demo</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/card-demo">Card Demo</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/alert-demo">Alert Demo</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dialog-demo">Dialog Demo</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/theme-test">Theme Test</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Theme Information */}
        <section className="space-y-4 text-center">
          <h2 className="text-2xl font-bold">Custom Theme</h2>
          <p className="text-muted-foreground">
            This project uses a custom Tailwind CSS theme with primary and
            secondary colors. Visit the{' '}
            <Link href="/theme-test" className="text-primary hover:underline">
              Theme Test
            </Link>{' '}
            page to see all theme customizations.
          </p>
        </section>
      </div>
    </MainLayout>
  );
}
