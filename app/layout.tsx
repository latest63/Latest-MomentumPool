import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://latest-momentum-pool.vercel.app'),
  title: 'Momentum Pool — World Cup 2026 on X Layer',
  description: 'Pick the dominant team in each half. A World Cup 2026 momentum-based prediction pool built on X Layer.',
  openGraph: {
    title: 'Momentum Pool',
    description: 'Pick the dominant team in each half. Built on X Layer.',
    images: ['/social/og.svg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Momentum Pool',
    description: 'Pick the dominant team in each half — built on X Layer.',
    images: ['/social/og.svg'],
  },
  icons: {
    icon: '/assets/logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
