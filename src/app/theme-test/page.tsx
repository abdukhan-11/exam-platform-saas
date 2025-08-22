import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function ThemeTestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-8">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Theme Customization Test</h1>
        <p className="text-lg text-muted-foreground">
          This page tests all theme customizations to ensure primary and
          secondary colors are working correctly.
        </p>
      </div>

      {/* Color Palette Display */}
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Color Palette</CardTitle>
          <CardDescription>
            Current theme colors from CSS variables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="h-20 w-full rounded-lg border bg-primary"></div>
              <p className="text-sm font-medium">Primary</p>
              <p className="text-xs text-muted-foreground">
                hsl(var(--primary))
              </p>
            </div>
            <div className="space-y-2">
              <div className="h-20 w-full rounded-lg border bg-secondary"></div>
              <p className="text-sm font-medium">Secondary</p>
              <p className="text-xs text-muted-foreground">
                hsl(var(--secondary))
              </p>
            </div>
            <div className="space-y-2">
              <div className="h-20 w-full rounded-lg border bg-accent"></div>
              <p className="text-sm font-medium">Accent</p>
              <p className="text-xs text-muted-foreground">
                hsl(var(--accent))
              </p>
            </div>
            <div className="space-y-2">
              <div className="h-20 w-full rounded-lg border bg-muted"></div>
              <p className="text-sm font-medium">Muted</p>
              <p className="text-xs text-muted-foreground">hsl(var(--muted))</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Button Variants Test */}
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Button Variants</CardTitle>
          <CardDescription>
            Testing all button variants with theme colors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button>Default (Primary)</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
        </CardContent>
      </Card>

      {/* Input Test */}
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Input Component</CardTitle>
          <CardDescription>Testing input with theme colors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input placeholder="Type something here..." />
            <Input
              placeholder="Another input field"
              className="focus:ring-2 focus:ring-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Alert Test */}
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Alert Components</CardTitle>
          <CardDescription>Testing alert variants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                This is a default alert message.
              </AlertDescription>
            </Alert>
            <Alert className="border-primary bg-primary/10">
              <AlertDescription>
                This alert uses primary colors.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Test */}
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Dialog Component</CardTitle>
          <CardDescription>Testing dialog with theme colors</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Theme Test Dialog</DialogTitle>
                <DialogDescription>
                  This dialog should use the theme colors correctly.
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                The dialog background, borders, and text should all follow the
                theme.
              </p>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* CSS Variables Display */}
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>CSS Variables</CardTitle>
          <CardDescription>Current CSS variable values</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <p>
                <strong>--primary:</strong> 221 83% 53%
              </p>
              <p>
                <strong>--secondary:</strong> 210 40% 96.1%
              </p>
              <p>
                <strong>--accent:</strong> 0 0% 96.1%
              </p>
              <p>
                <strong>--muted:</strong> 0 0% 96.1%
              </p>
            </div>
            <div>
              <p>
                <strong>--background:</strong> 0 0% 100%
              </p>
              <p>
                <strong>--foreground:</strong> 0 0% 3.9%
              </p>
              <p>
                <strong>--border:</strong> 0 0% 89.8%
              </p>
              <p>
                <strong>--radius:</strong> 0.5rem
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
