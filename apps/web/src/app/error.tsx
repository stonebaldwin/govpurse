'use client';

import Link from 'next/link';
import { Button } from '@govpurse/ui';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-ink text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted">An unexpected error occurred. This has been logged.</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </main>
  );
}
