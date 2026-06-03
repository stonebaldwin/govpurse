'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { SearchBox } from './search-box';

const LINKS = [
  { href: '/search', label: 'Search' },
  { href: '/jurisdictions', label: 'Jurisdictions' },
  { href: '/pricing', label: 'Pricing' },
];

/** Mobile navigation — a disclosure menu shown below the `md` breakpoint. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="border-line-strong text-ink hover:bg-surface-subtle inline-flex size-9 items-center justify-center rounded-md border transition-colors"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open ? (
        <div className="border-line bg-paper shadow-lift absolute inset-x-0 top-full border-b">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            <div className="pb-2">
              <SearchBox compact />
            </div>
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-ink hover:bg-surface-subtle rounded-md px-3 py-2 text-sm font-medium"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="text-primary-700 hover:bg-surface-subtle rounded-md px-3 py-2 text-sm font-medium"
            >
              Sign in
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
