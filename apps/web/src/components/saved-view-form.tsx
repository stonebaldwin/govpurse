'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@govpurse/ui';
import { createSavedView } from '@/lib/dashboard-actions';

const fieldClass =
  'border-line-strong bg-surface text-ink h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function SavedViewForm({
  canAlert,
  jurisdictions,
}: {
  canAlert: boolean;
  jurisdictions: { id: string; name: string }[];
}) {
  const [alert, setAlert] = useState(false);

  return (
    <form action={createSavedView} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="sv-name">View name</Label>
        <Input id="sv-name" name="name" placeholder="e.g. Acme payments in my city" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sv-q">Vendor contains</Label>
        <Input id="sv-q" name="q" placeholder="Acme" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sv-jurisdiction">Jurisdiction</Label>
        <select id="sv-jurisdiction" name="jurisdiction" className={fieldClass}>
          <option value="">Any jurisdiction</option>
          {jurisdictions.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <label className="text-ink flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="alert"
            checked={alert}
            onChange={(e) => setAlert(e.target.checked)}
            disabled={!canAlert}
            className="size-4"
          />
          Alert me on new matches {!canAlert ? <span className="text-faint">(Pro)</span> : null}
        </label>
        {alert && canAlert ? (
          <select name="alertType" className={fieldClass}>
            <option value="vendor-paid">When a watched vendor is paid</option>
            <option value="threshold">When a payment exceeds a threshold</option>
            <option value="category-spike">When a category spikes</option>
          </select>
        ) : null}
      </div>
      <div className="sm:col-span-2">
        <Button type="submit">Save view</Button>
      </div>
    </form>
  );
}
