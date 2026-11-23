import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Lilita_One, Nunito } from 'next/font/google';
import { loadCourse } from '@/lib/content';
import './globals.css';

// Self-hosted by Next.js at build time: no render-blocking request to Google, no layout shift.
const display = Lilita_One({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--font-display' });
const body = Nunito({ weight: ['600', '700', '800', '900'], subsets: ['latin'], display: 'swap', variable: '--font-body' });
const mono = JetBrains_Mono({ weight: '500', subsets: ['latin'], display: 'swap', variable: '--font-mono' });

export function generateMetadata(): Metadata {
  const c = loadCourse();
  return { title: c.title, description: c.tagline || c.subtitle || `Practice ${c.title}`, icons: { icon: `/assets/${c.mascot}` } };
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b1220' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
