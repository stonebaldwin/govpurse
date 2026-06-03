'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Bookmark,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Settings,
} from 'lucide-react';
import { Badge } from '@govpurse/ui';
import { SignOutButton } from './sign-out-button';

const BASE_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/views', label: 'Saved views', icon: Bookmark },
  { href: '/dashboard/alerts', label: 'Alert log', icon: Bell },
  { href: '/dashboard/account', label: 'Account', icon: Settings },
];

const BUSINESS_ITEMS = [
  { href: '/dashboard/watchlists', label: 'Watchlists', icon: ListChecks },
  { href: '/dashboard/api', label: 'API access', icon: KeyRound },
];

export function DashboardNav({
  email,
  plan,
  isBusiness,
}: {
  email: string;
  plan: string;
  isBusiness: boolean;
}) {
  const pathname = usePathname();
  const items = isBusiness ? [...BASE_ITEMS, ...BUSINESS_ITEMS] : BASE_ITEMS;

  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="text-ink flex items-center gap-2 font-semibold tracking-tight">
        <BarChart3 className="text-primary-500 size-5" /> Govpurse
      </Link>

      <nav className="mt-6 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? 'bg-surface-subtle text-ink font-medium' : 'text-muted hover:text-ink'
              }`}
            >
              <item.icon className="size-4" /> {item.label}
            </Link>
          );
        })}
        {!isBusiness ? (
          <Link
            href="/dashboard/watchlists"
            className="text-faint hover:text-ink flex items-center gap-2 rounded-md px-3 py-2 text-sm"
          >
            <ListChecks className="size-4" /> Watchlists
            <Badge variant="muted" className="ml-auto">
              Business
            </Badge>
          </Link>
        ) : null}
      </nav>

      <div className="border-line mt-6 space-y-2 border-t pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted truncate" title={email}>
            {email}
          </span>
          <Badge variant="outline" className="uppercase">
            {plan}
          </Badge>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}
