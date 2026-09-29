import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AnnouncementBar } from '@/components/shop/announcement-bar';
import { CartButton } from '@/components/shop/cart/cart-button';
import { CartDrawer } from '@/components/shop/cart/cart-drawer';
import { CartProvider } from '@/components/shop/cart/cart-provider';
import { ShopFooter } from '@/components/shop/footer';
import { FreeDeliveryProvider } from '@/components/shop/free-delivery/free-delivery-provider';
import { ShopHeader } from '@/components/shop/header';
import { getEnv } from '@/env';
import { dirOf, routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { getSettingsCached } from '@/server/next/storefront-data';
import '../globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
  preload: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: '#012755',
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });
  return {
    metadataBase: new URL(getEnv().SITE_URL),
    title: { default: t('defaultTitle'), template: '%s · IBADA' },
    description: t('defaultDescription'),
    applicationName: 'IBADA',
    openGraph: { siteName: 'IBADA', type: 'website', locale: locale === 'ar' ? 'ar_LB' : 'en_US' },
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([getTranslations({ locale, namespace: 'common' }), getSettingsCached()]);

  return (
    <html lang={locale} dir={dirOf(locale)} className={cn(jakarta.variable, plexArabic.variable, 'antialiased')}>
      <body className={cn('flex min-h-dvh flex-col bg-white text-ink', locale === 'ar' && 'font-arabic')}>
        <NextIntlClientProvider>
          <CartProvider>
            <FreeDeliveryProvider feeCents={settings.deliveryFeeCents} siteKey={getEnv().TURNSTILE_SITE_KEY}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
            >
              {t('skipToContent')}
            </a>
            <AnnouncementBar locale={locale} />
            <ShopHeader locale={locale} actions={<CartButton />} />
            <main id="main" className="flex-1">
              {children}
            </main>
            <ShopFooter locale={locale} />
            <CartDrawer />
            </FreeDeliveryProvider>
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
