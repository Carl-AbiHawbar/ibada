import { expect, test } from 'vitest';
import { parseDashboardRange } from '@/lib/dashboard-range';

const now = new Date('2026-09-27T09:00:00Z');

test('defaults to the last 7 Beirut days', () => {
  expect(parseDashboardRange({}, now)).toEqual({
    key: '7d',
    from: new Date('2026-09-20T21:00:00Z'),
    to: new Date('2026-09-27T21:00:00Z'),
    label: 'Last 7 days',
  });
});

test('presets', () => {
  expect(parseDashboardRange({ range: 'today' }, now)).toMatchObject({ key: 'today', label: 'Today' });
  expect(parseDashboardRange({ range: '30d' }, now)).toMatchObject({ key: '30d', from: new Date('2026-08-28T21:00:00Z') });
});

test('custom range includes both end days', () => {
  expect(parseDashboardRange({ from: '2026-09-01', to: '2026-09-03' }, now)).toEqual({
    key: 'custom',
    from: new Date('2026-08-31T21:00:00Z'),
    to: new Date('2026-09-03T21:00:00Z'),
    label: '2026-09-01 → 2026-09-03',
  });
});

test('bad or reversed custom dates fall back to the default', () => {
  expect(parseDashboardRange({ from: '2026-09-05', to: '2026-09-01' }, now).key).toBe('7d');
  expect(parseDashboardRange({ from: 'nope', to: '2026-09-01' }, now).key).toBe('7d');
  expect(parseDashboardRange({ from: '2024-01-01', to: '2026-09-01' }, now).key).toBe('7d'); // > 1 year
});
