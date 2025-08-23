import * as React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface ErrorDisplayProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'default' | 'destructive';
  title?: string;
  details?: string;
  showRetry?: boolean;
  showDismiss?: boolean;
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  variant = 'destructive',
  title = 'Error',
  details,
  showRetry = false,
  showDismiss = true,
}: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <Alert variant={variant} className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex-1">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="font-medium">{title}</div>
            <div className="mt-1">{error}</div>
            {details && (
              <div className="mt-2 text-sm text-muted-foreground">
                {details}
              </div>
            )}
          </div>
          <div className="flex gap-2 ml-4">
            {showRetry && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            )}
            {showDismiss && onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Success message component
interface SuccessDisplayProps {
  message: string | null;
  onDismiss?: () => void;
  title?: string;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function SuccessDisplay({
  message,
  onDismiss,
  title = 'Success',
  autoHide = true,
  autoHideDelay = 3000,
}: SuccessDisplayProps) {
  if (!message) return null;

  // Auto-hide after delay
  React.useEffect(() => {
    if (autoHide && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onDismiss]);

  return (
    <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
      <AlertDescription className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium">{title}</div>
          <div className="mt-1">{message}</div>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="ml-4 text-green-600 hover:text-green-700"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
