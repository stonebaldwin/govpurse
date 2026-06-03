import type { ReactNode } from 'react';
import { DashboardNav } from '@/components/dashboard-nav';
import { getEntitlements } from '@/lib/entitlements';
import { requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const ent = await getEntitlements(user.id);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl gap-8 px-6 py-8">
      <aside className="hidden w-52 shrink-0 sm:block">
        <DashboardNav email={user.email} plan={ent.plan} isBusiness={ent.plan === 'business'} />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
