import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Fraunces, IBM_Plex_Mono, Public_Sans } from 'next/font/google';
import { Toaster } from '@govpurse/ui';
import { JsonLd } from '@/components/json-ld';
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

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://govpurse.com';
const DESCRIPTION =
  'Search and visualize local-government spending — transaction-level vendor payments across jurisdictions, with watchdog-grade analytics and alerts.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  applicationName: 'Govpurse',
  title: {
    default: 'Govpurse — Follow the money in your local government',
    template: '%s · Govpurse',
  },
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'Govpurse',
    locale: 'en_US',
    url: '/',
    title: 'Govpurse — Follow the money in your local government',
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Govpurse — Follow the money in your local government',
    description: DESCRIPTION,
  },
};

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Govpurse',
    url: SITE,
    logo: `${SITE}/icon.svg`,
    description: DESCRIPTION,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Govpurse',
    url: SITE,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE}/search?q={query}`,
      'query-input': 'required name=query',
    },
  },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable}`}>
      <body className="bg-paper text-ink min-h-screen font-sans antialiased">
        <JsonLd data={structuredData} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
