import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'World Cup Momentum Pool — Built on X Layer',
  description: 'A 2026 World Cup-themed GameFi dApp built on X Layer. Pick the dominant team in each half.',
  openGraph: {
    title: 'World Cup Momentum Pool',
    description: 'Pick the dominant team in each half. Built on X Layer.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
