import Link from 'next/link';
import { Button } from '@govpurse/ui';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-faint font-mono text-sm">404</p>
      <h1 className="text-ink text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted">
        That page doesn’t exist — or it’s a jurisdiction we don’t cover yet.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/search">Search spending</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </main>
  );
}
