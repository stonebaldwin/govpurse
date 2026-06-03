import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Govpurse handles your data.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-ink text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="text-faint mt-2 text-sm">Last updated: {new Date().getUTCFullYear()}</p>

      <div className="text-muted mt-6 space-y-4 text-sm leading-relaxed">
        <p>This is a template policy — have it reviewed by counsel before launch.</p>
        <h2 className="text-ink pt-2 text-lg font-semibold">What we store</h2>
        <p>
          The spending records on Govpurse are public government data about{' '}
          <em>governments and the businesses they pay</em> — not private individuals. For accounts,
          we store your email, name, saved views, alert preferences, and subscription status.
          Authentication and billing are handled by Better Auth and Stripe respectively.
        </p>
        <h2 className="text-ink pt-2 text-lg font-semibold">Not a consumer report</h2>
        <p>
          Govpurse is not a background-check or people-search product and is not intended for
          FCRA-covered uses. Vendor subjects are business entities, not consumers.
        </p>
        <h2 className="text-ink pt-2 text-lg font-semibold">Email</h2>
        <p>
          We send transactional email (sign-in links, alert notifications) via Resend. Alerts are
          opt-in and managed from your dashboard.
        </p>
        <h2 className="text-ink pt-2 text-lg font-semibold">Your choices</h2>
        <p>
          You can delete saved views and alerts anytime, and request account deletion via the footer
          contact.
        </p>
      </div>
    </main>
  );
}
