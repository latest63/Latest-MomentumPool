import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Momentum Pool — OKX X Cup Hackathon',
  description: 'Pick the dominant team in each half. Built on X Layer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
