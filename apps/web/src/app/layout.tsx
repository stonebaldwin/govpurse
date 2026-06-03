import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from '@govpurse/ui';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-paper text-ink min-h-screen font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
