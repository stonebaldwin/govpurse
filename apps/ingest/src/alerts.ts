import { and, eq } from 'drizzle-orm';
import type { SyncRunResult } from '@govpurse/core';
import {
  alertSubscriptions,
  alerts,
  savedViews,
  spendEvents,
  users,
  type SpendEventRow,
} from '@govpurse/db';
import type { Database } from './db';
import { sendEmail } from './email';
import type { Env } from './env';

function appUrl(env: Env): string {
  return env.APP_URL ?? 'http://localhost:3000';
}

function usd(value: string | null): string {
  const n = Number(value ?? 0);
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** Notify the operator about a failed/anomalous ingestion run (the #1 breakage). */
export async function sendOperatorAlert(env: Env, run: SyncRunResult): Promise<void> {
  if (!env.OPERATOR_ALERT_EMAIL) {
    console.warn(
      '[ingest] unhealthy run, OPERATOR_ALERT_EMAIL unset:',
      run.jurisdictionId,
      run.anomalyReasons,
    );
    return;
  }
  const reasons = run.anomalyReasons.length
    ? run.anomalyReasons.join('; ')
    : (run.error ?? 'failed');
  await sendEmail(env, {
    to: env.OPERATOR_ALERT_EMAIL,
    subject: `⚠️ Govpurse ingest ${run.status}: ${run.jurisdictionId}`,
    html: `<p>Dataset <b>${run.jurisdictionId}${run.datasetId ? ` / ${run.datasetId}` : ''}</b> finished <b>${run.status}</b>.</p>
      <p>${reasons}</p>
      <p>rows seen: ${run.rowsSeen} · new: ${run.rowsNew} · mapping errors: ${run.mappingErrors}</p>`,
  }).catch((e) => console.error('[ingest] operator email failed', e));
}

function describe(ev: SpendEventRow, env: Env): { subject: string; html: string } {
  const link = ev.vendorId
    ? `${appUrl(env)}/vendors/${ev.vendorId}`
    : `${appUrl(env)}/jurisdictions/${ev.jurisdictionId}`;
  const amount = usd(ev.value);
  let line: string;
  switch (ev.type) {
    case 'vendor-payment':
      line = `${ev.jurisdictionId} paid ${ev.vendorName ?? 'a watched vendor'} ${amount}.`;
      break;
    case 'threshold-exceeded':
      line = `A payment of ${amount}${ev.vendorName ? ` to ${ev.vendorName}` : ''} exceeded your threshold in ${ev.jurisdictionId}.`;
      break;
    case 'spending-spike':
      line = `Spending${ev.category ? ` on ${ev.category}` : ''} in ${ev.jurisdictionId} spiked to ${amount} (${ev.period}).`;
      break;
    default:
      line = `A saved view matched new data (${amount}).`;
  }
  return {
    subject: `Govpurse alert: ${line.slice(0, 80)}`,
    html: `<p>${line}</p><p><a href="${link}">View on Govpurse →</a></p><p style="color:#888;font-size:12px">This is a computed match on public records — verify on the linked page.</p>`,
  };
}

async function deliver(
  db: Database,
  env: Env,
  userId: string,
  savedViewId: string,
  ev: SpendEventRow,
): Promise<void> {
  // Dedupe via the unique (userId, savedViewId, spendEventId) index.
  const [row] = await db
    .insert(alerts)
    .values({ userId, savedViewId, spendEventId: ev.id, channel: 'email', status: 'sent' })
    .onConflictDoNothing()
    .returning({ id: alerts.id });
  if (!row) return;

  const [u] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) return;

  const { subject, html } = describe(ev, env);
  try {
    const sent = await sendEmail(env, { to: u.email, subject, html });
    await db
      .update(alerts)
      .set({ status: sent ? 'sent' : 'skipped', sentAt: new Date() })
      .where(eq(alerts.id, row.id));
  } catch (e) {
    console.error('[ingest/alerts] email failed', e);
    await db.update(alerts).set({ status: 'failed' }).where(eq(alerts.id, row.id));
  }
}

/**
 * Turn unprocessed spend events into delivered alerts. Idempotent: events are
 * marked processed, and per-user delivery is deduped by a unique index.
 */
export async function processAlerts(db: Database, env: Env): Promise<void> {
  const events = await db
    .select()
    .from(spendEvents)
    .where(eq(spendEvents.processed, false))
    .limit(500);

  for (const ev of events) {
    try {
      if (ev.watchId) {
        // watchId is the saved view id; deliver to that view's active subscribers.
        const subs = await db
          .select({ userId: alertSubscriptions.userId })
          .from(alertSubscriptions)
          .where(
            and(
              eq(alertSubscriptions.savedViewId, ev.watchId),
              eq(alertSubscriptions.isActive, true),
            ),
          );
        for (const s of subs) await deliver(db, env, s.userId, ev.watchId, ev);
      } else if (ev.type === 'spending-spike') {
        const subs = await db
          .select({
            savedViewId: alertSubscriptions.savedViewId,
            userId: alertSubscriptions.userId,
            filters: savedViews.filters,
          })
          .from(alertSubscriptions)
          .innerJoin(savedViews, eq(savedViews.id, alertSubscriptions.savedViewId))
          .where(
            and(
              eq(alertSubscriptions.isActive, true),
              eq(alertSubscriptions.type, 'category-spike'),
            ),
          );
        for (const s of subs) {
          const f = (s.filters ?? {}) as Record<string, unknown>;
          if (typeof f.jurisdiction === 'string' && f.jurisdiction !== ev.jurisdictionId) continue;
          if (typeof f.category === 'string' && ev.category && f.category !== ev.category) continue;
          await deliver(db, env, s.userId, s.savedViewId, ev);
        }
      }
      await db.update(spendEvents).set({ processed: true }).where(eq(spendEvents.id, ev.id));
    } catch (e) {
      console.error('[ingest/alerts] failed to process event', ev.id, e);
    }
  }
}
