import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, formatNumber } from '@govpurse/ui';
import { ManageBillingButton } from '@/components/manage-billing-button';
import { getEntitlements } from '@/lib/entitlements';
import { requireUser } from '@/lib/session';

function limit(n: number): string {
  return Number.isFinite(n) ? formatNumber(n) : 'Unlimited';
}

export default async function AccountPage() {
  const user = await requireUser();
  const ent = await getEntitlements(user.id);

  const capabilities: { label: string; on: boolean; detail?: string }[] = [
    { label: 'Saved views', on: true, detail: limit(ent.maxSavedViews) },
    { label: 'Alerts', on: ent.alerts, detail: ent.alerts ? limit(ent.maxAlerts) : 'Off' },
    { label: 'CSV exports', on: ent.exports },
    { label: 'Year-over-year & advanced analytics', on: ent.advancedAnalytics },
    { label: 'Multi-jurisdiction watchlists', on: ent.multiJurisdictionWatchlists },
    { label: 'Team seats', on: ent.teamSeats },
    { label: 'API access', on: ent.apiAccess },
  ];

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-muted mt-1">{user.email}</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Your plan</CardTitle>
          <Badge variant="outline" className="uppercase">
            {ent.plan}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm">
            {capabilities.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                {c.on ? (
                  <Check className="text-down size-4 shrink-0" />
                ) : (
                  <X className="text-faint size-4 shrink-0" />
                )}
                <span className={c.on ? 'text-ink' : 'text-faint'}>{c.label}</span>
                {c.detail ? (
                  <span className="text-muted ml-auto font-mono text-xs">{c.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="border-line flex items-center gap-3 border-t pt-4">
            {ent.plan === 'free' ? (
              <Button asChild>
                <Link href="/pricing">Upgrade</Link>
              </Button>
            ) : (
              <ManageBillingButton />
            )}
            <Link href="/pricing" className="text-muted text-sm hover:underline">
              Compare plans
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
