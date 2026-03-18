import type { Metadata } from 'next';
import './globals.css';
import { DiscoveryLayout } from './components/layout/DiscoveryLayout';

export const metadata: Metadata = {
  title: 'PACCT Discovery Server',
  description: 'Discovery and coordination service for PACCT networks',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <DiscoveryLayout>
          {children}
        </DiscoveryLayout>
      </body>
    </html>
  );
}
