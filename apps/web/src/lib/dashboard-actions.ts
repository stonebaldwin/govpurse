'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { alertSubscriptions, savedViews } from '@govpurse/db';
import { tryGetDb } from '@/lib/db';
import { getEntitlements } from '@/lib/entitlements';
import { requireUser } from '@/lib/session';

type AlertType = 'vendor-paid' | 'category-spike' | 'threshold';

export async function createSavedView(formData: FormData): Promise<void> {
  const user = await requireUser();
  const db = tryGetDb();
  if (!db) return;

  const name = String(formData.get('name') ?? '').trim() || 'Untitled view';
  const jurisdiction = String(formData.get('jurisdiction') ?? '').trim() || undefined;
  const q = String(formData.get('q') ?? '').trim() || undefined;
  const wantAlert = formData.get('alert') === 'on';
  const alertType =
    (String(formData.get('alertType') ?? 'vendor-paid') as AlertType) ?? 'vendor-paid';

  const ent = await getEntitlements(user.id);
  const existing = await db
    .select({ id: savedViews.id })
    .from(savedViews)
    .where(eq(savedViews.userId, user.id));
  if (existing.length >= ent.maxSavedViews) return; // server-side enforcement of plan limits

  const enableAlert = wantAlert && ent.alerts;
  const [view] = await db
    .insert(savedViews)
    .values({ userId: user.id, name, filters: { jurisdiction, q }, isAlert: enableAlert })
    .returning();

  if (enableAlert && view) {
    await db
      .insert(alertSubscriptions)
      .values({ savedViewId: view.id, userId: user.id, type: alertType, frequency: 'instant' });
  }
  revalidatePath('/dashboard/views');
  revalidatePath('/dashboard');
}

export async function deleteSavedView(formData: FormData): Promise<void> {
  const user = await requireUser();
  const db = tryGetDb();
  if (!db) return;
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await db.delete(savedViews).where(and(eq(savedViews.id, id), eq(savedViews.userId, user.id)));
  revalidatePath('/dashboard/views');
  revalidatePath('/dashboard');
}

export async function toggleAlert(formData: FormData): Promise<void> {
  const user = await requireUser();
  const db = tryGetDb();
  if (!db) return;
  const savedViewId = String(formData.get('savedViewId') ?? '');
  if (!savedViewId) return;

  const ent = await getEntitlements(user.id);
  if (!ent.alerts) return; // gated: free plan can't enable alerts

  const [sub] = await db
    .select()
    .from(alertSubscriptions)
    .where(
      and(eq(alertSubscriptions.savedViewId, savedViewId), eq(alertSubscriptions.userId, user.id)),
    )
    .limit(1);

  if (sub) {
    await db
      .update(alertSubscriptions)
      .set({ isActive: !sub.isActive })
      .where(eq(alertSubscriptions.id, sub.id));
  } else {
    await db
      .insert(alertSubscriptions)
      .values({ savedViewId, userId: user.id, type: 'vendor-paid', frequency: 'instant' });
    await db.update(savedViews).set({ isAlert: true }).where(eq(savedViews.id, savedViewId));
  }
  revalidatePath('/dashboard/views');
}
