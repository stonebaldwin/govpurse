'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push('/');
        router.refresh();
      }}
      className="text-muted hover:text-ink inline-flex items-center gap-2 text-sm transition-colors"
    >
      <LogOut className="size-4" /> Sign out
    </button>
  );
}
