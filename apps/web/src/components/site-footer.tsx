import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-line text-muted mt-20 border-t">
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm">
        <div className="grid gap-8 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <p className="text-ink font-semibold">Govpurse</p>
            <p className="mt-2 max-w-sm">
              Public financial records, made searchable and visual. Figures labeled “analysis” are
              computed by Govpurse — not official findings. Every record links to its official portal
              with a retrieval timestamp.
            </p>
          </div>
          <div>
            <p className="text-ink mb-2 font-medium">Explore</p>
            <ul className="space-y-1.5">
              <li>
                <Link href="/search" className="hover:text-ink">
                  Search spending
                </Link>
              </li>
              <li>
                <Link href="/jurisdictions" className="hover:text-ink">
                  Jurisdictions
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-ink">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-ink mb-2 font-medium">Trust</p>
            <ul className="space-y-1.5">
              <li>
                <Link href="/methodology" className="hover:text-ink">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-ink">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-ink">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="text-faint mt-8 text-xs">
          © {new Date().getUTCFullYear()} Govpurse · govpurse.com
        </p>
      </div>
    </footer>
  );
}
