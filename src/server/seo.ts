import type { ProductView } from './catalog';

const dollars = (cents: number) => (cents / 100).toFixed(2);

/** schema.org Product data so search results can show price, availability and stars. */
export function productJsonLd(
  p: ProductView,
  a: { locale: 'en' | 'ar'; url: string; rating: { count: number; average: number } },
): object {
  const origin = new URL(a.url).origin;
  const prices = p.bundles.map((b) => b.priceCents);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name[a.locale],
    description: p.tagline[a.locale],
    image: p.images.map((i) => new URL(i.url, origin).toString()),
    brand: { '@type': 'Brand', name: 'IBADA' },
    sku: p.slug,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: dollars(Math.min(...prices)),
      highPrice: dollars(Math.max(...prices)),
      offerCount: p.bundles.length,
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: a.url,
    },
    ...(a.rating.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: a.rating.average,
            reviewCount: a.rating.count,
            bestRating: 5,
          },
        }
      : {}),
  };
}

/** JSON for a <script type="application/ld+json">, with `<` escaped so it can't close the tag. */
export function jsonLdScript(obj: object): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}
