import Link from 'next/link';
import { BrandMark } from './brand-mark';

export function SiteFooter() {
  return (
    <footer className="border-line text-muted mt-20 border-t">
      <div className="mx-auto max-w-6xl px-6 py-12 text-sm">
        <div className="grid gap-8 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <div className="text-ink flex items-center gap-2.5">
              <BrandMark className="size-7" />
              <span className="font-display text-lg font-semibold tracking-tight">Govpurse</span>
            </div>
            <p className="mt-3 max-w-sm">
              Public financial records, made searchable and visual. Figures labeled “analysis” are
              computed by Govpurse — not official findings. Every record links to its official portal
              with a retrieval timestamp.
            </p>
          </div>
          <div>
            <p className="text-ink mb-2 font-semibold">Explore</p>
            <ul className="space-y-1.5">
              <li>
                <Link href="/search" className="hover:text-primary-600">
                  Search spending
                </Link>
              </li>
              <li>
                <Link href="/jurisdictions" className="hover:text-primary-600">
                  Jurisdictions
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-primary-600">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-ink mb-2 font-semibold">Trust</p>
            <ul className="space-y-1.5">
              <li>
                <Link href="/methodology" className="hover:text-primary-600">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary-600">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-primary-600">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="text-faint mt-10 text-xs">
          © {new Date().getUTCFullYear()} Govpurse · Transparency, not accusation · govpurse.com
        </p>
      </div>
    </footer>
  );
}
