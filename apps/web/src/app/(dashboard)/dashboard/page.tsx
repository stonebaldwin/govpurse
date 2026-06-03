import Link from 'next/link';
import { Bell, Plus } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  formatCompactCurrency,
  formatDate,
  formatNumber,
  StatCard,
} from '@govpurse/ui';
import { getDashboardSummary, getRecentMatches, type RecentMatch } from '@/lib/dashboard';
import { requireUser } from '@/lib/session';

function matchMessage(m: RecentMatch): string {
  switch (m.eventType) {
    case 'vendor-payment':
      return `New payment to ${m.vendorName ?? 'a watched vendor'}`;
    case 'threshold-exceeded':
      return `Payment over your threshold${m.vendorName ? ` to ${m.vendorName}` : ''}`;
    case 'spending-spike':
      return `Spending spike${m.category ? ` in ${m.category}` : ''}`;
    case 'sole-source-pattern':
      return `Repeat sole-source pattern${m.vendorName ? ` for ${m.vendorName}` : ''}`;
    default:
      return 'New match on a saved view';
  }
}

export default async function DashboardHome() {
  const user = await requireUser();
  const [summary, matches] = await Promise.all([
    getDashboardSummary(user.id),
    getRecentMatches(user.id, 8),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted mt-1">Your saved views and the latest matches.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Saved views" value={formatNumber(summary.savedViewCount)} />
        <StatCard label="Active alerts" value={formatNumber(summary.activeAlertCount)} />
        <StatCard label="Matches this week" value={formatNumber(summary.matchesThisWeek)} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent matches</CardTitle>
          <Button asChild size="sm" variant="secondary">
            <Link href="/dashboard/views">
              <Plus className="size-4" /> New view
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No matches yet"
              description="Create a saved view and turn on alerts to be notified when spending changes."
              action={
                <Button asChild size="sm">
                  <Link href="/dashboard/views">Create a saved view</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-line divide-y">
              {matches.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-ink truncate text-sm font-medium">{matchMessage(m)}</p>
                    <p className="text-faint text-xs">
                      {m.jurisdictionId ?? '—'}
                      {m.period ? ` · ${m.period}` : ''} · {formatDate(m.createdAt)}
                    </p>
                  </div>
                  <span className="text-muted shrink-0 font-mono text-sm tabular-nums">
                    {formatCompactCurrency(m.value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
