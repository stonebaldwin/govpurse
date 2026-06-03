import Link from 'next/link';
import { ListChecks } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@govpurse/ui';
import { getEntitlements } from '@/lib/entitlements';
import { requireUser } from '@/lib/session';

export default async function WatchlistsPage() {
  const user = await requireUser();
  const ent = await getEntitlements(user.id);

  if (!ent.multiJurisdictionWatchlists) {
    return (
      <div className="space-y-6">
        <h1 className="text-ink text-2xl font-semibold tracking-tight">Watchlists</h1>
        <EmptyState
          icon={ListChecks}
          title="Watchlists are a Business feature"
          description="Group vendors, jurisdictions, and departments to monitor them together — with bulk add and team seats."
          action={
            <Button asChild size="sm">
              <Link href="/pricing">Upgrade to Business</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-ink text-2xl font-semibold tracking-tight">Watchlists</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your watchlists</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted text-sm">
            Group vendors and jurisdictions to track them as a set. Bulk import from a list, and
            share with your team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
