import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Govpurse <noreply@govpurse.com>';

/** Send an email via Resend; in dev without a key, log instead of failing. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — would send "${opts.subject}" to ${opts.to}`);
    return;
  }
  await resend.emails.send({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html });
}

export async function sendMagicLinkEmail(to: string, url: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Your Govpurse sign-in link',
    html: `<p>Click to sign in to Govpurse:</p><p><a href="${url}">${url}</a></p><p>This link expires shortly. If you didn't request it, ignore this email.</p>`,
  });
}
