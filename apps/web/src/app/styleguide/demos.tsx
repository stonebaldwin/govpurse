'use client';

import { Button, toast } from '@govpurse/ui';

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        onClick={() =>
          toast('New payment to Acme Construction Co.', {
            description: '$482,150 · Public Works · Jun 1, 2026',
          })
        }
      >
        Show toast
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast.success('Alert saved — we’ll email you on new matches')}
      >
        Success
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast.error('Socrata portal is temporarily unreachable')}
      >
        Error
      </Button>
    </div>
  );
}
