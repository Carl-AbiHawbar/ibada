import type { MetadataRoute } from 'next';
import { getEnv } from '@/env';
import { listActiveProducts } from '@/server/catalog';
import { getDb } from '@/server/db/client';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getEnv().SITE_URL;
  const products = await listActiveProducts(getDb());
  const paths = [
    '',
    '/shop',
    '/contact',
    '/policies/shipping',
    '/policies/returns',
    '/policies/privacy',
    '/policies/terms',
    ...products.map((p) => `/products/${p.slug}`),
  ];
  return paths.flatMap((path) =>
    (['en', 'ar'] as const).map((locale) => ({
      url: `${base}/${locale}${path}`,
      changeFrequency: path === '' ? ('daily' as const) : ('weekly' as const),
      priority: path === '' ? 1 : path.startsWith('/products') ? 0.9 : 0.5,
      alternates: { languages: { en: `${base}/en${path}`, ar: `${base}/ar${path}` } },
    })),
  );
}
