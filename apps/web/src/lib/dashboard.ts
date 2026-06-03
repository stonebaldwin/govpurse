import { and, desc, eq, gte } from 'drizzle-orm';
import { alertSubscriptions, alerts, savedViews, spendEvents } from '@govpurse/db';
import { num, tryGetDb } from './db';

export interface SavedViewWithAlert {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  isAlert: boolean;
  createdAt: Date;
  alert: { id: string; type: string; frequency: string; isActive: boolean } | null;
}

export async function getSavedViews(userId: string): Promise<SavedViewWithAlert[]> {
  const db = tryGetDb();
  if (!db) return [];
  const views = await db
    .select()
    .from(savedViews)
    .where(eq(savedViews.userId, userId))
    .orderBy(desc(savedViews.createdAt));
  const subs = await db
    .select()
    .from(alertSubscriptions)
    .where(eq(alertSubscriptions.userId, userId));
  const byView = new Map(subs.map((s) => [s.savedViewId, s]));
  return views.map((v) => {
    const sub = byView.get(v.id);
    return {
      id: v.id,
      name: v.name,
      filters: v.filters,
      isAlert: v.isAlert,
      createdAt: v.createdAt,
      alert: sub
        ? { id: sub.id, type: sub.type, frequency: sub.frequency, isActive: sub.isActive }
        : null,
    };
  });
}

export interface RecentMatch {
  id: string;
  status: string;
  createdAt: Date;
  eventType: string | null;
  vendorName: string | null;
  category: string | null;
  jurisdictionId: string | null;
  period: string | null;
  value: number;
}

export async function getRecentMatches(userId: string, limit = 10): Promise<RecentMatch[]> {
  const db = tryGetDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: alerts.id,
      status: alerts.status,
      createdAt: alerts.createdAt,
      eventType: spendEvents.type,
      vendorName: spendEvents.vendorName,
      category: spendEvents.category,
      jurisdictionId: spendEvents.jurisdictionId,
      period: spendEvents.period,
      value: spendEvents.value,
    })
    .from(alerts)
    .leftJoin(spendEvents, eq(spendEvents.id, alerts.spendEventId))
    .where(eq(alerts.userId, userId))
    .orderBy(desc(alerts.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, value: num(r.value) }));
}

export interface DashboardSummary {
  savedViewCount: number;
  activeAlertCount: number;
  matchesThisWeek: number;
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const db = tryGetDb();
  const views = await getSavedViews(userId);
  const activeAlertCount = views.filter((v) => v.alert?.isActive).length;
  let matchesThisWeek = 0;
  if (db) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = await db
      .select({ id: alerts.id })
      .from(alerts)
      .where(and(eq(alerts.userId, userId), gte(alerts.createdAt, weekAgo)));
    matchesThisWeek = recent.length;
  }
  return { savedViewCount: views.length, activeAlertCount, matchesThisWeek };
}
