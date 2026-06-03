import { eq } from 'drizzle-orm';
import { subscriptions } from '@govpurse/db';
import { tryGetDb } from './db';

export type Plan = 'free' | 'pro' | 'business';

export interface Entitlements {
  plan: Plan;
  /** Alerts allowed at all. */
  alerts: boolean;
  maxSavedViews: number;
  maxAlerts: number;
  exports: boolean;
  multiJurisdictionWatchlists: boolean;
  teamSeats: boolean;
  apiAccess: boolean;
  advancedAnalytics: boolean;
}

const PLANS: Record<Plan, Entitlements> = {
  free: {
    plan: 'free',
    alerts: false,
    maxSavedViews: 3,
    maxAlerts: 0,
    exports: false,
    multiJurisdictionWatchlists: false,
    teamSeats: false,
    apiAccess: false,
    advancedAnalytics: false,
  },
  pro: {
    plan: 'pro',
    alerts: true,
    maxSavedViews: Number.POSITIVE_INFINITY,
    maxAlerts: 50,
    exports: true,
    multiJurisdictionWatchlists: false,
    teamSeats: false,
    apiAccess: false,
    advancedAnalytics: true,
  },
  business: {
    plan: 'business',
    alerts: true,
    maxSavedViews: Number.POSITIVE_INFINITY,
    maxAlerts: Number.POSITIVE_INFINITY,
    exports: true,
    multiJurisdictionWatchlists: true,
    teamSeats: true,
    apiAccess: true,
    advancedAnalytics: true,
  },
};

/** Entitlements for a plan — the static capability table. */
export function entitlementsForPlan(plan: Plan): Entitlements {
  return PLANS[plan];
}

/**
 * The single source of truth for what a user can do. Derives the plan from the
 * `subscriptions` table (synced from Stripe in Phase 5). Used to gate both UI
 * and server actions — never trust the client.
 */
export async function getEntitlements(userId: string): Promise<Entitlements> {
  const db = tryGetDb();
  let plan: Plan = 'free';
  if (db) {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
    if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
      plan = sub.plan;
    }
  }
  return entitlementsForPlan(plan);
}
