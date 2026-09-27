import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { ProductPage, productMetadata } from '@/server/next/product-page';
import { getFeaturedProductCached } from '@/server/next/storefront-data';

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const product = await getFeaturedProductCached();
  return product ? productMetadata(product, locale, '') : {};
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const product = await getFeaturedProductCached();
  if (!product) {
    const t = await getTranslations({ locale, namespace: 'shop' });
    return <p className="mx-auto max-w-6xl px-4 py-24 text-center text-muted-ink">{t('empty')}</p>;
  }
  return <ProductPage product={product} locale={locale} path="" />;
}
