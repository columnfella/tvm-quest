import type { Metadata, Viewport } from 'next';
import { loadCourse } from '@/lib/content';
import './globals.css';

export function generateMetadata(): Metadata {
  const c = loadCourse();
  return { title: c.title, description: c.tagline || c.subtitle || `Practice ${c.title}`, icons: { icon: `/assets/${c.mascot}` } };
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b1220' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@600;700;800;900&family=JetBrains+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
