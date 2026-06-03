import Link from 'next/link';
import { BrandMark } from './brand-mark';
import { MobileNav } from './mobile-nav';
import { SearchBox } from './search-box';

export function SiteHeader() {
  return (
    <header className="border-line bg-paper/80 sticky top-0 z-30 border-b backdrop-blur">
      {/* Masthead accent rule */}
      <div className="bg-primary-500 h-[3px] w-full" />
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
        <Link href="/" className="text-ink flex shrink-0 items-center gap-2.5">
          <BrandMark className="size-7" />
          <span className="font-display text-[1.2rem] font-semibold tracking-tight">Govpurse</span>
        </Link>
        <nav className="text-muted hidden items-center gap-6 text-sm font-medium md:flex">
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
        <div className="ml-auto hidden w-full max-w-xs md:block">
          <SearchBox compact />
        </div>
        <Link
          href="/login"
          className="border-line-strong text-ink hover:border-primary-500 hover:text-primary-600 hidden shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors md:inline-flex"
        >
          Sign in
        </Link>
        {/* Mobile menu (below md) */}
        <div className="ml-auto md:hidden">
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
