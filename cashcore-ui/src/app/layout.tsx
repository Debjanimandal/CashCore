import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'CashCore — Friegter Wallet',
  description: 'Testnet wallet-based digital payment app powered by Friegter Wallet. Send, receive, and track tFRGT on the Friegter testnet.',
  keywords: ['cashcore', 'friegter wallet', 'testnet', 'digital payments', 'tFRGT'],
  authors: [{ name: 'CashCore Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0A0E1A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div className="page-container">
          {children}
        </div>
      </body>
    </html>
  );
}
