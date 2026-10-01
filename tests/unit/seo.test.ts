import { expect, test } from 'vitest';
import type { ProductView } from '@/server/catalog';
import { jsonLdScript, productJsonLd } from '@/server/seo';

const bundle = (priceCents: number, units: number) => ({
  id: `b${units}`,
  name: { en: `B${units}`, ar: `ب${units}` },
  subtitle: { en: '', ar: '' },
  units,
  priceCents,
  compareAtCents: null,
  badge: 'none' as const,
  imageUrl: null,
  isDefault: false,
  savePercent: null,
  perUnitCents: priceCents / units,
});

const p: ProductView = {
  id: 'p1',
  slug: 'ibada-one',
  name: { en: 'IBADA ONE', ar: 'IBADA ONE' },
  tagline: { en: 'Helps repel pests.', ar: 'يساعد على إبعاد الحشرات.' },
  description: { en: 'Long', ar: 'طويل' },
  seoTitle: { en: '', ar: '' },
  seoDescription: { en: '', ar: '' },
  images: [{ id: 'i1', url: '/images/products/ibada-one-single.webp', urlAr: null, alt: { en: 'a', ar: 'ب' }, width: 10, height: 10 }],
  bundles: [bundle(3600, 2), bundle(2000, 1), bundle(6000, 4), bundle(5100, 3)],
  stockUnits: 100,
  inStock: true,
};
const a = { locale: 'en' as const, url: 'https://ibadashop.com/en', rating: { count: 0, average: 0 } };

test('aggregate offer spans the cheapest and dearest bundle', () => {
  const ld = productJsonLd(p, a) as Record<string, any>;
  expect(ld['@type']).toBe('Product');
  expect(ld.brand).toEqual({ '@type': 'Brand', name: 'IBADA' });
  expect(ld.image).toEqual(['https://ibadashop.com/images/products/ibada-one-single.webp']);
  expect(ld.offers).toMatchObject({
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '20.00',
    highPrice: '60.00',
    offerCount: 4,
    availability: 'https://schema.org/InStock',
    url: 'https://ibadashop.com/en',
  });
  expect(ld.aggregateRating).toBeUndefined();
});

test('uses the page language and reports out of stock', () => {
  const ld = productJsonLd({ ...p, inStock: false }, { ...a, locale: 'ar' }) as Record<string, any>;
  expect(ld.description).toBe('يساعد على إبعاد الحشرات.');
  expect(ld.offers.availability).toBe('https://schema.org/OutOfStock');
});

test('rating appears only when there are reviews', () => {
  const ld = productJsonLd(p, { ...a, rating: { count: 3, average: 4.3 } }) as Record<string, any>;
  expect(ld.aggregateRating).toEqual({ '@type': 'AggregateRating', ratingValue: 4.3, reviewCount: 3, bestRating: 5 });
});

test('json-ld cannot break out of its script tag', () => {
  const out = jsonLdScript({ name: '</script><script>alert(1)</script>' });
  expect(out).not.toContain('</script>');
  expect(out).not.toContain('<');
  expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>' });
});
