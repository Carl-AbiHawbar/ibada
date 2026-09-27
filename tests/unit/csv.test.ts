import { expect, test } from 'vitest';
import { ordersToCsv } from '@/server/orders/csv';
import type { OrderExportRow } from '@/server/orders/admin-query';

const row: OrderExportRow = {
  number: 1001,
  createdAt: new Date('2026-09-26T21:30:00Z'),
  status: 'new',
  name: 'Ali Haddad',
  phone: '+9613123456',
  governorate: 'mount-lebanon',
  district: 'metn',
  town: 'Jdeideh',
  addressLine: 'Main st, Bldg 5',
  landmark: 'Near "Abou Ali" bakery',
  notes: '',
  items: 'Multi-Room Protection x1',
  totalCents: 3600,
};

test('header row', () => {
  expect(ordersToCsv([row]).split('\r\n')[0]).toBe(
    'Order,Date,Status,Name,Phone,Governorate,District,Town,Address,Landmark,Notes,Items,Total USD',
  );
});

test('row values: Beirut time, readable names, local phone, dollars', () => {
  expect(ordersToCsv([row]).split('\r\n')[1]).toBe(
    '1001,2026-09-27 00:30,New,Ali Haddad,03 123 456,Mount Lebanon,Metn,Jdeideh,"Main st, Bldg 5","Near ""Abou Ali"" bakery",,Multi-Room Protection x1,36.00',
  );
});

test('spreadsheet formula injection is neutralized', () => {
  const out = ordersToCsv([{ ...row, name: '=HYPERLINK("x")', notes: '@SUM(A1)', town: '-2+3' }]);
  expect(out).toContain(`"'=HYPERLINK(""x"")"`);
  expect(out).toContain(`'@SUM(A1)`);
  expect(out).toContain(`'-2+3`);
});

test('newlines are quoted', () => {
  expect(ordersToCsv([{ ...row, notes: 'line1\nline2' }])).toContain('"line1\nline2"');
});
