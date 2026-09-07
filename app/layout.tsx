import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://move-club-motion.vercel.app');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Move Club — Motion & Interaction Studies',
  description: 'An evolving collection of interactive studies exploring responsive feeds, selection, reveal, depth, layout, and motion.',
  openGraph: {
    title: 'Move Club',
    description: 'A playground for motion, ideas & people.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Move Club',
    description: 'A playground for motion, ideas & people.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
