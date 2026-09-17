import React from 'react';
import './globals.css';
import { PWARefreshHandler } from '../components/providers/PWARefreshHandler';
import { Providers } from './providers';

export const viewport = {
  themeColor: '#08090C',
  viewportFit: 'cover',
};

export const metadata = {
  title: 'Just1Play',
  description: 'Digital sports media, recruiting, and social analytics platform for multi-sport athletes and college recruiters.',
  openGraph: {
    title: 'Just1Play',
    description: 'Digital sports media, recruiting, and social analytics platform for multi-sport athletes and college recruiters.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-[#08090C] text-white min-h-[100dvh]" style={{ backgroundColor: '#08090C', color: '#FFFFFF' }}>
      <body className="min-h-[100dvh] bg-[#08090C] text-white overflow-x-hidden antialiased" style={{ backgroundColor: '#08090C', color: '#FFFFFF' }}>
        <PWARefreshHandler />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
