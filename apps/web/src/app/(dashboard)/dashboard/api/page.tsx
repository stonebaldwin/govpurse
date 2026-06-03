import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@govpurse/ui';
import { getEntitlements } from '@/lib/entitlements';
import { requireUser } from '@/lib/session';

export default async function ApiAccessPage() {
  const user = await requireUser();
  const ent = await getEntitlements(user.id);

  if (!ent.apiAccess) {
    return (
      <div className="space-y-6">
        <h1 className="text-ink text-2xl font-semibold tracking-tight">API access</h1>
        <EmptyState
          icon={KeyRound}
          title="API access is a Business feature"
          description="Query search, aggregates, and alerts programmatically with an API key."
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
      <h1 className="text-ink text-2xl font-semibold tracking-tight">API access</h1>
      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted text-sm">
            Generate a key to query the read API over search, aggregates, and alerts. Keys are
            plan-gated and rate-limited.
          </p>
          <code className="text-muted bg-surface-subtle mt-3 block rounded-md px-3 py-2 font-mono text-xs">
            curl https://govpurse.com/api/v1/transactions?vendor=acme -H &quot;Authorization:
            Bearer sk_…&quot;
          </code>
        </CardContent>
      </Card>
    </div>
  );
}
