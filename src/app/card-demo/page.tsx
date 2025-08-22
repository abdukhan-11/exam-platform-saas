import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function CardDemoPage() {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Card Demo</h1>
      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Card</CardTitle>
            <CardDescription>Simple content in a card.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use cards to group related information.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Another Card</CardTitle>
            <CardDescription>With different content.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Add any elements inside.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
