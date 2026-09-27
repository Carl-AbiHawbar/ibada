import { expect, test } from 'vitest';
import { formatLebanesePhone, normalizeLebanesePhone } from '@/lib/phone';

test.each([
  ['03 123 456', '+9613123456'],
  ['3123456', '+9613123456'],
  ['+961 3 123 456', '+9613123456'],
  ['00961 70 123 456', '+96170123456'],
  ['70-123-456', '+96170123456'],
  ['081123456', '+96181123456'],
  ['96176123456', '+96176123456'],
  ['٠٣ ١٢٣ ٤٥٦', '+9613123456'], // Arabic-Indic digits from an Arabic keyboard
  ['۰۷۱۱۲۳۴۵۶', '+96171123456'], // Eastern Arabic-Indic digits
  ['(78) 123.456', '+96178123456'],
  ['79123456', '+96179123456'],
])('normalizes %s', (input, expected) => {
  expect(normalizeLebanesePhone(input)).toBe(expected);
});

test.each(['01 123 456', '72123456', '0312345', '', '+1 555 123 4567', '031234567', 'abc', '+961'])(
  'rejects %s',
  (input) => {
    expect(normalizeLebanesePhone(input)).toBeNull();
  },
);

test('formats E.164 for people', () => {
  expect(formatLebanesePhone('+9613123456')).toBe('03 123 456');
  expect(formatLebanesePhone('+96170123456')).toBe('70 123 456');
});
