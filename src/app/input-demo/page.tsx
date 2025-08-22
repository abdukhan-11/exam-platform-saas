import { Input } from '@/components/ui/input';

export default function InputDemoPage() {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Input Demo</h1>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input id="email" type="email" placeholder="you@example.com" />
      </div>
    </main>
  );
}
