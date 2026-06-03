import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Methodology',
  description: 'How Govpurse sources, normalizes, and analyzes public-government spending data.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-line space-y-2 border-t py-6">
      <h2 className="text-ink text-lg font-semibold tracking-tight">{title}</h2>
      <div className="text-muted space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-ink text-3xl font-semibold tracking-tight">Methodology</h1>
      <p className="text-muted mt-3">
        Govpurse aggregates public financial records and presents both the raw data and
        clearly-labeled computed analysis. This page explains how the figures are produced — what is
        official record and what is our calculation — so you can judge and verify everything
        yourself.
      </p>

      <Section title="Where the data comes from">
        <p>
          We ingest transaction-level spending from official government open-data portals —
          primarily Socrata (SODA) “open checkbook” datasets, plus OpenGov and published CSVs. We
          prefer official APIs over scraping and respect each portal’s terms and rate limits. Every
          record links back to its official source with the timestamp we retrieved it.
        </p>
      </Section>

      <Section title="Normalization">
        <p>
          Source schemas vary widely, so we map each portal’s columns to a common set of fields and
          coerce values consistently: amounts (including refunds shown as negatives), dates, fiscal
          years, departments, and categories. We keep the original row for audit.
        </p>
      </Section>

      <Section title="Vendor resolution">
        <p>
          The same company often appears under many spellings (“ABC Inc”, “A.B.C. Incorporated”,
          “ABC INC.”). We group these into a single vendor entity using conservative matching that
          favors precision — we would rather leave two records unmerged than wrongly combine two
          different companies. Where a match is uncertain it is held for human review, and each
          vendor shows a match-confidence figure.
        </p>
      </Section>

      <Section title="Computed analysis (not findings)">
        <p>
          Figures labeled “analysis” are calculated by Govpurse and are not official designations:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>Vendor concentration</strong> — a vendor’s share of spending within a scope, and
            the Herfindahl–Hirschman Index. High concentration is a prompt to look closer, not a
            conclusion.
          </li>
          <li>
            <strong>Spending spike</strong> — a month or category whose spend is anomalously high
            versus its own trailing baseline (it must clear both a statistical and an absolute bar).
          </li>
          <li>
            <strong>Repeat sole-source</strong> — vendors repeatedly paid via sole-source / no-bid
            procurement, only where the source data marks procurement method.
          </li>
        </ul>
        <p>
          We never assert wrongdoing. Every analytic links to the underlying transactions so you can
          verify the math and read the records yourself.
        </p>
      </Section>

      <Section title="Corrections">
        <p>
          Found an error or a mismatched vendor? We want to fix it. Use the contact path in the
          footer and include the jurisdiction and record. Corrections to source data should also be
          raised with the government that published it; we mirror the official record.
        </p>
      </Section>
    </main>
  );
}
