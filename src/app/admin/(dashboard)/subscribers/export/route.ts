import { beirutDateKey } from '@/lib/dates';
import { getDb } from '@/server/db/client';
import { deliverySignupsToCsv, listDeliverySignups } from '@/server/delivery-signups';
import { requireAdmin } from '@/server/next/admin-session';

export async function GET() {
  await requireAdmin('subscribers');
  const rows = await listDeliverySignups(getDb(), { limit: 100_000, offset: 0 });
  // BOM so Excel opens Arabic names correctly.
  return new Response(`﻿${deliverySignupsToCsv(rows)}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="ibada-subscribers-${beirutDateKey(new Date())}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
