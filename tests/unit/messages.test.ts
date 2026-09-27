import { expect, test } from 'vitest';
import en from '../../messages/en.json';
import ar from '../../messages/ar.json';

const keys = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v as object, `${p}${k}.`) : [`${p}${k}`]));

test('English and Arabic define exactly the same keys', () => {
  expect(keys(ar).sort()).toEqual(keys(en).sort());
});

test('no empty translations', () => {
  const empty = (o: object, p = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) =>
      v && typeof v === 'object' ? empty(v as object, `${p}${k}.`) : String(v).trim() === '' ? [`${p}${k}`] : [],
    );
  expect(empty(en)).toEqual([]);
  expect(empty(ar)).toEqual([]);
});
