'use server';

import { z } from 'zod';
import { getDb } from '@/server/db/client';
import { listVisibleReviews, type ReviewView } from '@/server/reviews';

const loadMoreSchema = z.object({ productId: z.uuid(), offset: z.int().min(0).max(1000) });

export async function loadMoreReviewsAction(productId: string, offset: number): Promise<ReviewView[]> {
  const parsed = loadMoreSchema.safeParse({ productId, offset });
  if (!parsed.success) return [];
  return listVisibleReviews(getDb(), parsed.data.productId, { limit: 6, offset: parsed.data.offset });
}
