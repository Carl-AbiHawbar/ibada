import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { connection } from 'next/server';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import '../globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'IBADA Admin', template: '%s · IBADA Admin' },
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
  manifest: '/admin/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'IBADA', statusBarStyle: 'default' },
  icons: { apple: '/admin/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = { themeColor: '#012755', width: 'device-width', initialScale: 1 };

export default async function AdminRootLayout({ children }: LayoutProps<'/admin'>) {
  // Admin pages carry a per-request nonce CSP; a pre-rendered page would have un-nonced scripts that the CSP blocks.
  await connection();
  return (
    <html lang="en" dir="ltr" className={cn(jakarta.variable, 'antialiased')}>
      <body className="min-h-dvh bg-slate-50 text-ink">
        {children}
        <Toaster theme="light" position="top-center" richColors />
      </body>
    </html>
  );
}
