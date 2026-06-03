import { Resend } from 'resend';
import type { Env } from './env';

export async function sendEmail(
  env: Env,
  opts: { to: string; subject: string; html: string },
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn(
      `[ingest/email] RESEND_API_KEY not set — would send "${opts.subject}" to ${opts.to}`,
    );
    return false;
  }
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL ?? 'Govpurse <noreply@govpurse.com>',
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  return true;
}
