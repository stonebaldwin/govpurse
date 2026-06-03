import type { ReactNode } from 'react';
import Link from 'next/link';
import { requireOperator } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireOperator();
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="border-line mb-8 flex flex-wrap items-center gap-4 border-b pb-4">
        <span className="text-ink font-semibold tracking-tight">Govpurse Admin</span>
        <nav className="text-muted flex gap-4 text-sm">
          <Link href="/admin" className="hover:text-ink">
            Health
          </Link>
          <Link href="/admin/review" className="hover:text-ink">
            Review queue
          </Link>
          <Link href="/admin/coverage" className="hover:text-ink">
            Coverage
          </Link>
        </nav>
        <Link href="/dashboard" className="text-muted ml-auto text-sm hover:underline">
          ← Dashboard
        </Link>
      </header>
      {children}
    </div>
  );
}
