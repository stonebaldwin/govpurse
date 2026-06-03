import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Fraunces, IBM_Plex_Mono, Public_Sans } from 'next/font/google';
import { Toaster } from '@govpurse/ui';
import './globals.css';

// Display serif (editorial headlines) — optical-size axis for crisp big type.
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});
// Civic UI sans (the USWDS typeface).
const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-public-sans', display: 'swap' });
// Monospace for every figure — tabular, aligned.
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Govpurse — Follow the money in your local government',
    template: '%s · Govpurse',
  },
  description:
    'Search and visualize local-government spending — vendor payments, budgets, and contracts — across jurisdictions, with watchdog-grade analytics and alerts.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable}`}
    >
      <body className="bg-paper text-ink min-h-screen font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
