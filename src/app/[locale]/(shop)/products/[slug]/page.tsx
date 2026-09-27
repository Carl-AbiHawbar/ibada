import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { listActiveProducts } from '@/server/catalog';
import { getDb } from '@/server/db/client';
import { ProductPage, productMetadata } from '@/server/next/product-page';
import { getProductBySlugCached } from '@/server/next/storefront-data';

export async function generateStaticParams() {
  const products = await listActiveProducts(getDb());
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<'/[locale]/products/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlugCached(slug);
  return product ? productMetadata(product, locale as Locale, `/products/${slug}`) : {};
}

export default async function ProductRoute({ params }: PageProps<'/[locale]/products/[slug]'>) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlugCached(slug);
  if (!product) notFound();
  return <ProductPage product={product} locale={locale as Locale} path={`/products/${slug}`} />;
}
