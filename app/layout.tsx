import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://move-club-photo-motion.ranlous.chatgpt.site',
  ),
  title: 'Move Club — Ten Motion Studies',
  description: 'Ten interactive studies exploring selection, reveal, counting, hover, transfer, depth, layout, and status motion.',
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
