import { Terminal } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AlertDemoPage() {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Alert Demo</h1>
      <div className="w-full max-w-md space-y-3">
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>
            You can use alerts to convey important information.
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong.</AlertDescription>
        </Alert>
      </div>
    </main>
  );
}
