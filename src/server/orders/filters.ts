import { rangeForPreset } from '@/lib/dates';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/order-status';
import type { OrderFilter } from './admin-query';

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Read the orders list filters from URL search params, ignoring anything malformed. */
export function parseOrderFilters(params: Params, now = new Date()): OrderFilter & { page: number; range?: string } {
  const status = first(params.status);
  const range = first(params.range);
  const q = first(params.q)?.trim().slice(0, 80);
  const page = Math.max(1, Math.min(10_000, Number(first(params.page)) || 1));
  const dates = range === 'today' || range === '7d' || range === '30d' ? rangeForPreset(range, now) : undefined;
  return {
    status: ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined,
    q: q || undefined,
    from: dates?.from,
    to: dates?.to,
    page,
    range: dates ? range : undefined,
  };
}
