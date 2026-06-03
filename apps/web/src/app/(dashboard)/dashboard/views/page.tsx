import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@govpurse/ui';
import { SavedViewForm } from '@/components/saved-view-form';
import { getSavedViews } from '@/lib/dashboard';
import { deleteSavedView, toggleAlert } from '@/lib/dashboard-actions';
import { getFacets } from '@/lib/data';
import { getEntitlements } from '@/lib/entitlements';
import { requireUser } from '@/lib/session';

function filterSummary(filters: Record<string, unknown>): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`Vendor: ${String(filters.q)}`);
  if (filters.jurisdiction) parts.push(`Jurisdiction: ${String(filters.jurisdiction)}`);
  return parts.length ? parts.join(' · ') : 'All spending';
}

export default async function SavedViewsPage() {
  const user = await requireUser();
  const [ent, views, facets] = await Promise.all([
    getEntitlements(user.id),
    getSavedViews(user.id),
    getFacets(),
  ]);
  const atLimit = views.length >= ent.maxSavedViews;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight">Saved views</h1>
        <p className="text-muted mt-1">Save searches and turn them into alerts.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a view</CardTitle>
        </CardHeader>
        <CardContent>
          {atLimit ? (
            <div className="text-muted text-sm">
              You’ve reached the {ent.plan} plan limit of{' '}
              {Number.isFinite(ent.maxSavedViews) ? ent.maxSavedViews : 'unlimited'} saved views.{' '}
              <Link href="/pricing" className="text-primary-500 font-medium hover:underline">
                Upgrade for more
              </Link>
              .
            </div>
          ) : (
            <SavedViewForm canAlert={ent.alerts} jurisdictions={facets.jurisdictions} />
          )}
        </CardContent>
      </Card>

      {views.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved views yet"
          description="Create your first view above."
        />
      ) : (
        <div className="space-y-3">
          {views.map((v) => (
            <Card key={v.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-ink font-medium">{v.name}</p>
                    {v.alert?.isActive ? <Badge variant="muted">Alert on</Badge> : null}
                  </div>
                  <p className="text-faint mt-0.5 text-sm">{filterSummary(v.filters)}</p>
                </div>
                <div className="flex items-center gap-1">
                  {ent.alerts ? (
                    <form action={toggleAlert}>
                      <input type="hidden" name="savedViewId" value={v.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        {v.alert?.isActive ? 'Pause alert' : 'Enable alert'}
                      </Button>
                    </form>
                  ) : null}
                  <form action={deleteSavedView}>
                    <input type="hidden" name="id" value={v.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Delete
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
