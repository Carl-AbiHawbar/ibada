import { formatBeirut } from '@/lib/dates';
import { districtName, governorateName, type DistrictId, type GovernorateId } from '@/lib/lebanon';
import { STATUS_LABELS } from '@/lib/order-status';
import { formatLebanesePhone } from '@/lib/phone';
import type { OrderExportRow } from './admin-query';

const HEADER = [
  'Order',
  'Date',
  'Status',
  'Name',
  'Phone',
  'Governorate',
  'District',
  'Town',
  'Address',
  'Landmark',
  'Notes',
  'Items',
  'Total USD',
];

function cell(value: string | number): string {
  let v = String(value);
  // Neutralize spreadsheet formulas typed into checkout fields.
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** RFC 4180 CSV (CRLF) for couriers and spreadsheets. */
export function ordersToCsv(rows: OrderExportRow[]): string {
  const lines = rows.map((r) =>
    [
      r.number,
      formatBeirut(r.createdAt, 'datetime'),
      STATUS_LABELS[r.status],
      r.name,
      formatLebanesePhone(r.phone),
      governorateName(r.governorate as GovernorateId, 'en'),
      districtName(r.district as DistrictId, 'en'),
      r.town,
      r.addressLine,
      r.landmark,
      r.notes,
      r.items,
      (r.totalCents / 100).toFixed(2),
    ]
      .map(cell)
      .join(','),
  );
  return [HEADER.join(','), ...lines].join('\r\n') + '\r\n';
}
