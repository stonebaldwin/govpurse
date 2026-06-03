'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';

/** App-wide toast portal. Mount once in the root layout. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      gap={8}
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border border-line bg-surface text-ink shadow-card text-sm',
          title: 'text-ink font-medium',
          description: 'text-muted',
          actionButton: 'bg-primary-500 text-white rounded-md',
          cancelButton: 'bg-surface-subtle text-ink rounded-md',
        },
      }}
    />
  );
}

export { toast };
