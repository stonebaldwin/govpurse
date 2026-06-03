import Link from 'next/link';
import { SearchBox } from './search-box';

export function SiteHeader() {
  return (
    <header className="border-line bg-paper/85 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
        <Link href="/" className="text-ink shrink-0 font-semibold tracking-tight">
          Govpurse
        </Link>
        <nav className="text-muted hidden items-center gap-5 text-sm md:flex">
          <Link href="/search" className="hover:text-ink transition-colors">
            Search
          </Link>
          <Link href="/jurisdictions" className="hover:text-ink transition-colors">
            Jurisdictions
          </Link>
          <Link href="/pricing" className="hover:text-ink transition-colors">
            Pricing
          </Link>
        </nav>
        <div className="ml-auto hidden w-full max-w-xs sm:block">
          <SearchBox compact />
        </div>
        <Link
          href="/login"
          className="text-muted hover:text-ink shrink-0 text-sm font-medium transition-colors"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
