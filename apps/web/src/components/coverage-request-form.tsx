'use client';

import { useActionState } from 'react';
import { Button, Input } from '@govpurse/ui';
import { type CoverageState, requestCoverage } from '@/app/actions';

const INITIAL: CoverageState = { ok: false, message: '' };

export function CoverageRequestForm() {
  const [state, action, pending] = useActionState(requestCoverage, INITIAL);

  if (state.ok) {
    return <p className="text-down text-sm font-medium">{state.message}</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Input
        name="jurisdictionName"
        placeholder="City or county name"
        className="max-w-[16rem]"
        required
      />
      <Input name="state" placeholder="State" className="w-20" aria-label="State" />
      <Input
        name="email"
        type="email"
        placeholder="Email (optional)"
        className="max-w-[14rem]"
        aria-label="Email"
      />
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Request'}
      </Button>
      {state.message && !state.ok ? (
        <span className="text-spike text-sm">{state.message}</span>
      ) : null}
    </form>
  );
}
