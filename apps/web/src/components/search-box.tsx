'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button, Input } from '@govpurse/ui';

export function SearchBox({ compact, defaultValue }: { compact?: boolean; defaultValue?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue ?? '');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search');
      }}
      className="flex w-full gap-2"
      role="search"
    >
      <div className="relative flex-1">
        <Search className="text-faint pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={compact ? 'Search a vendor…' : 'Search a vendor, e.g. “Acme Construction”'}
          className="pl-9"
          aria-label="Search transactions"
        />
      </div>
      {!compact ? (
        <Button type="submit" size={compact ? 'sm' : 'md'}>
          Search
        </Button>
      ) : null}
    </form>
  );
}
