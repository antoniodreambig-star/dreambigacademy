import type { Metadata, Viewport } from 'next';
import './globals.css';
import RegisterSW from '@/components/RegisterSW';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://app.dreambigctx.com').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Dream Big Academy', template: '%s | Dream Big Academy' },
  description: 'Student portal for the Dream Big Studios Audio Engineering Academy.',
  robots: { index: false, follow: false },
  // The card people see when this link is shared (Facebook, iMessage, LinkedIn, X, Slack...). Image: public/share-app.png.
  openGraph: {
    type: 'website',
    siteName: 'Dream Big Academy',
    title: 'Dream Big Academy',
    description: 'Learn to record, mix and master. The Dream Big Studios Audio Engineering Academy student portal.',
    images: [{ url: '/share-app.png', width: 1200, height: 630, alt: 'Dream Big Academy: learn to record, mix and master' }],
  },
  twitter: { card: 'summary_large_image', title: 'Dream Big Academy', description: 'Learn to record, mix and master.', images: ['/share-app.png'] },
  appleWebApp: { title: 'Dream Big Academy', statusBarStyle: 'black-translucent' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1e0f33' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100,800..900&family=Kumbh+Sans:wght@400;600;700;800&display=swap"
        />
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
