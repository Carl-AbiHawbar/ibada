import 'server-only';
import type { Metadata } from 'next';
import { ProductTemplate } from '@/components/shop/product/product-template';
import { getEnv } from '@/env';
import type { Locale } from '@/i18n/routing';
import type { ProductView } from '../catalog';
import { getReviewSummaryCached, getSettingsCached, listVisibleReviewsCached } from './storefront-data';

/** Absolute URL of a storefront path for a locale, e.g. ('ar', '/shop'). */
export function pageUrl(locale: Locale, path = ''): string {
  return new URL(`/${locale}${path}`, getEnv().SITE_URL).toString();
}

export function productMetadata(product: ProductView, locale: Locale, path: string): Metadata {
  const title = product.seoTitle[locale] || product.name[locale];
  const description = product.seoDescription[locale] || product.tagline[locale];
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: { en: `/en${path}`, ar: `/ar${path}`, 'x-default': `/en${path}` },
    },
    openGraph: { title, description, url: `/${locale}${path}` },
  };
}

export async function ProductPage({ product, locale, path }: { product: ProductView; locale: Locale; path: string }) {
  const [settings, summary, reviews] = await Promise.all([
    getSettingsCached(),
    getReviewSummaryCached(product.id),
    listVisibleReviewsCached(product.id, 6, 0),
  ]);
  return (
    <ProductTemplate
      locale={locale}
      product={product}
      settings={settings}
      summary={summary}
      reviews={reviews}
      url={pageUrl(locale, path)}
    />
  );
}
