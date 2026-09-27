import type { MetadataRoute } from 'next';
import { getEnv } from '@/env';

export default function robots(): MetadataRoute.Robots {
  const base = getEnv().SITE_URL;
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/en/checkout', '/ar/checkout', '/en/order', '/ar/order', '/en/track', '/ar/track'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
