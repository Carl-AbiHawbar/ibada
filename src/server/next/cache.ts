import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';

export const TAGS = { catalog: 'catalog', settings: 'settings', reviews: 'reviews' } as const;
export type Tag = (typeof TAGS)[keyof typeof TAGS];

/** Cache a storefront read across requests; invalidated by `invalidate(tag)`. */
export function cached<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  key: string[],
  tags: Tag[],
): (...args: A) => Promise<R> {
  return unstable_cache(fn, key, { tags });
}

/** Expire cached storefront data now, so the next visitor sees the change. */
export function invalidate(...tags: Tag[]): void {
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
}
