'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

class DashboardErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Error Boundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      // Default error fallback
      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred in the dashboard. Please try refreshing the page or contact support if the problem persists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && error && (
            <div className="p-3 bg-gray-100 rounded text-sm">
              <p className="font-semibold text-red-600">Error Details:</p>
              <p className="text-gray-700">{error.message}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Smaller error boundary for individual dashboard components
export function DashboardComponentErrorBoundary({ children, componentName }: { children: React.ReactNode; componentName: string }) {
  return (
    <DashboardErrorBoundary
      fallback={({ error, resetError }) => (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 text-lg flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              {componentName} Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 text-sm mb-3">
              This component failed to load. You can try refreshing it below.
            </p>
            {process.env.NODE_ENV === 'development' && error && (
              <div className="p-2 bg-red-100 rounded text-xs mb-3">
                <p className="font-semibold">Error: {error.message}</p>
              </div>
            )}
            <Button onClick={resetError} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-3 w-3" />
              Retry Component
            </Button>
          </CardContent>
        </Card>
      )}
    >
      {children}
    </DashboardErrorBoundary>
  );
}

export default DashboardErrorBoundary;
