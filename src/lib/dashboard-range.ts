import { addDays, beirutDayStart, rangeForPreset } from './dates';

export type DashboardRange = { key: 'today' | '7d' | '30d' | 'custom'; from: Date; to: Date; label: string };

const LABELS = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days' } as const;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 366;

/** Dashboard date range from URL params: a preset, or custom Beirut days (both ends included). */
export function parseDashboardRange(params: Record<string, string | string[] | undefined>, now = new Date()): DashboardRange {
  const get = (k: string) => {
    const v = params[k];
    return typeof v === 'string' ? v : undefined;
  };
  const from = get('from');
  const to = get('to');
  if (from && to && DAY.test(from) && DAY.test(to) && from <= to) {
    const start = beirutDayStart(from);
    const end = beirutDayStart(addDays(to, 1));
    if ((end.getTime() - start.getTime()) / 86_400_000 <= MAX_DAYS) {
      return { key: 'custom', from: start, to: end, label: `${from} → ${to}` };
    }
  }
  const range = get('range');
  const key = range === 'today' || range === '30d' ? range : '7d';
  return { key, ...rangeForPreset(key, now), label: LABELS[key] };
}
