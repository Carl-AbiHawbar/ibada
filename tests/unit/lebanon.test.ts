import { expect, test } from 'vitest';
import { GOVERNORATES, districtName, governorateName, isValidDistrict } from '@/lib/lebanon';

test('8 governorates and 26 districts', () => {
  expect(GOVERNORATES).toHaveLength(8);
  expect(GOVERNORATES.flatMap((g) => g.districts)).toHaveLength(26);
  expect(new Set(GOVERNORATES.flatMap((g) => g.districts.map((d) => d.id))).size).toBe(26);
});

test('district must belong to its governorate', () => {
  expect(isValidDistrict('mount-lebanon', 'metn')).toBe(true);
  expect(isValidDistrict('north', 'minieh-danniyeh')).toBe(true);
  expect(isValidDistrict('beirut', 'tripoli')).toBe(false);
  expect(isValidDistrict('nowhere', 'beirut')).toBe(false);
});

test('names in both languages', () => {
  expect(districtName('bint-jbeil', 'en')).toBe('Bint Jbeil');
  expect(districtName('west-bekaa', 'en')).toBe('West Bekaa');
  expect(districtName('minieh-danniyeh', 'en')).toBe('Minieh-Danniyeh');
  expect(districtName('metn', 'ar')).toBe('المتن');
  expect(governorateName('baalbek-hermel', 'en')).toBe('Baalbek-Hermel');
  expect(governorateName('south', 'ar')).toBe('الجنوب');
});
