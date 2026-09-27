import { expect, test } from 'vitest';
import { beirutDateKey, beirutDayStart, formatBeirut, rangeForPreset } from '@/lib/dates';

test('Beirut calendar day, summer (UTC+3) and winter (UTC+2)', () => {
  expect(beirutDateKey(new Date('2026-09-26T21:30:00Z'))).toBe('2026-09-27');
  expect(beirutDateKey(new Date('2026-09-26T20:59:00Z'))).toBe('2026-09-26');
  expect(beirutDateKey(new Date('2026-01-10T22:30:00Z'))).toBe('2026-01-11');
});

test('start of a Beirut day in UTC', () => {
  expect(beirutDayStart('2026-09-27')).toEqual(new Date('2026-09-26T21:00:00Z'));
  expect(beirutDayStart('2026-01-11')).toEqual(new Date('2026-01-10T22:00:00Z'));
});

test('an order at 00:30 Beirut belongs to today', () => {
  expect(rangeForPreset('today', new Date('2026-09-26T21:30:00Z'))).toEqual({
    from: new Date('2026-09-26T21:00:00Z'),
    to: new Date('2026-09-27T21:00:00Z'),
  });
});

test('7 and 30 day ranges include today', () => {
  const now = new Date('2026-09-27T09:00:00Z');
  expect(rangeForPreset('7d', now)).toEqual({
    from: new Date('2026-09-20T21:00:00Z'),
    to: new Date('2026-09-27T21:00:00Z'),
  });
  expect(rangeForPreset('30d', now).from).toEqual(new Date('2026-08-28T21:00:00Z'));
});

test('ranges spanning the October DST change stay on Beirut midnights', () => {
  // Lebanon leaves summer time on the last Sunday of October 2026 (Oct 25).
  const r = rangeForPreset('7d', new Date('2026-10-27T09:00:00Z'));
  expect(r.from).toEqual(new Date('2026-10-20T21:00:00Z'));
  expect(r.to).toEqual(new Date('2026-10-27T22:00:00Z'));
});

test('formats timestamps in Beirut time', () => {
  expect(formatBeirut(new Date('2026-09-26T21:30:00Z'), 'datetime')).toBe('2026-09-27 00:30');
  expect(formatBeirut(new Date('2026-09-26T21:30:00Z'), 'date')).toBe('2026-09-27');
});
