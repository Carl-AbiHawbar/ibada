import 'server-only';
import { getFeaturedProduct, getProductBySlug, listActiveProducts } from '../catalog';
import { getDb } from '../db/client';
import { getReviewSummary, listVisibleReviews } from '../reviews';
import { getSettings } from '../settings';
import { TAGS, cached } from './cache';

export const getFeaturedProductCached = cached(() => getFeaturedProduct(getDb()), ['featured-product'], [TAGS.catalog]);

export const getProductBySlugCached = cached(
  (slug: string) => getProductBySlug(getDb(), slug),
  ['product-by-slug'],
  [TAGS.catalog],
);

export const listActiveProductsCached = cached(() => listActiveProducts(getDb()), ['active-products'], [TAGS.catalog]);

export const getSettingsCached = cached(() => getSettings(getDb()), ['settings'], [TAGS.settings]);

export const getReviewSummaryCached = cached(
  (productId: string) => getReviewSummary(getDb(), productId),
  ['review-summary'],
  [TAGS.reviews],
);

export const listVisibleReviewsCached = cached(
  (productId: string, limit: number, offset: number) => listVisibleReviews(getDb(), productId, { limit, offset }),
  ['visible-reviews'],
  [TAGS.reviews],
);
