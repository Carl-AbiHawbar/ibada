export type FunnelEventType = 'view_product' | 'add_to_cart' | 'begin_checkout';

/** Fire-and-forget anonymous funnel event (visits → cart → checkout) for the admin dashboard. */
export function track(type: FunnelEventType): void {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({ type, locale: document.documentElement.lang === 'ar' ? 'ar' : 'en' });
  try {
    if (navigator.sendBeacon?.('/api/events', new Blob([body], { type: 'application/json' }))) return;
  } catch {
    // Fall through to fetch.
  }
  fetch('/api/events', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(
    () => {},
  );
}
