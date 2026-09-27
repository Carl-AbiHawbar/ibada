import type { Db } from './db/client';
import { events } from './db/schema';

export type FunnelEvent = 'view_product' | 'add_to_cart' | 'begin_checkout' | 'order_placed';

/** Record one anonymous funnel step for a browser session. */
export async function recordEvent(
  db: Db,
  e: { type: FunnelEvent; sessionId: string; locale: 'en' | 'ar'; now?: Date },
): Promise<void> {
  await db.insert(events).values({ type: e.type, sessionId: e.sessionId, locale: e.locale, createdAt: e.now ?? new Date() });
}
