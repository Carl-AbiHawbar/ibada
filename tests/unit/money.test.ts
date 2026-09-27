import { expect, test } from 'vitest';
import { formatUsd, perUnitCents, savePercent } from '@/lib/money';

test('save % and per-unit price match the pricing sheet', () => {
  const rows: [number, number, number][] = [
    [2000, 3000, 1],
    [3600, 6000, 2],
    [5100, 9000, 3],
    [6000, 12000, 4],
  ];
  expect(rows.map(([p, c, u]) => [savePercent(p, c), perUnitCents(p, u)])).toEqual([
    [33, 2000],
    [40, 1800],
    [43, 1700],
    [50, 1500],
  ]);
});

test('no save % without a higher compare-at price', () => {
  expect(savePercent(2000, null)).toBeNull();
  expect(savePercent(2000, 2000)).toBeNull();
  expect(savePercent(2000, 1500)).toBeNull();
});

test('formats USD with cents only when needed', () => {
  expect(formatUsd(3600)).toBe('$36');
  expect(formatUsd(3240)).toBe('$32.40');
  expect(formatUsd(5)).toBe('$0.05');
  expect(formatUsd(-360)).toBe('-$3.60');
  expect(formatUsd(123456)).toBe('$1,234.56');
});
