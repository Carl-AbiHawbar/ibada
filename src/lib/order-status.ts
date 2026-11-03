export const ORDER_STATUSES = ['new', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled', 'returned'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

/** Admin-facing English labels. */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return [...TRANSITIONS[from]];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export type PaymentLabel = 'Payment pending' | 'Paid' | 'Voided' | 'Refunded';

/** Shopify-style payment state for a cash-on-delivery order. */
export function paymentLabel(status: OrderStatus, paymentStatus: 'pending' | 'paid'): PaymentLabel {
  if (status === 'returned') return 'Refunded';
  if (status === 'cancelled') return 'Voided';
  return paymentStatus === 'paid' ? 'Paid' : 'Payment pending';
}
