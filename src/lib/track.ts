export type FunnelEventType = 'view_product' | 'add_to_cart' | 'begin_checkout';

/** Anonymous funnel event (implemented in Task 12). */
export function track(_type: FunnelEventType): void {}
