import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms governing use of Govpurse.',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-ink text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="text-faint mt-2 text-sm">Last updated: {new Date().getUTCFullYear()}</p>

      <div className="text-muted mt-6 space-y-4 text-sm leading-relaxed">
        <p>
          Govpurse provides search, visualization, and analysis of public government financial
          records. By using Govpurse you agree to these terms. This is a template — have it reviewed
          by counsel before launch.
        </p>
        <h2 className="text-ink pt-2 text-lg font-semibold">The data</h2>
        <p>
          Records are sourced from official government open-data portals and are presented as
          published, with the retrieval timestamp shown. Computed figures (concentration, spikes,
          repeat sole-source) are Govpurse’s analysis, not official findings, and are provided “as is”
          without warranty of accuracy. Verify against the linked official source before relying on
          any figure.
        </p>
        <h2 className="text-ink pt-2 text-lg font-semibold">Acceptable use</h2>
        <p>
          Don’t use Govpurse to harass individuals, misrepresent the data as official findings, or
          violate the terms of the underlying portals. API access (where provided) is rate-limited
          and plan-gated.
        </p>
        <h2 className="text-ink pt-2 text-lg font-semibold">Subscriptions</h2>
        <p>
          Paid plans are billed through Stripe and are self-serve — manage or cancel anytime from
          your account. Fees are non-refundable except where required by law.
        </p>
        <h2 className="text-ink pt-2 text-lg font-semibold">Contact</h2>
        <p>Questions or corrections: use the contact path in the footer.</p>
      </div>
    </main>
  );
}
