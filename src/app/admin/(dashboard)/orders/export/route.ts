import type { NextRequest } from 'next/server';
import { beirutDateKey } from '@/lib/dates';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { getOrdersForExport } from '@/server/orders/admin-query';
import { ordersToCsv } from '@/server/orders/csv';
import { parseOrderFilters } from '@/server/orders/filters';

export async function GET(req: NextRequest) {
  await requireAdmin('orders');
  const filters = parseOrderFilters(Object.fromEntries(req.nextUrl.searchParams));
  const rows = await getOrdersForExport(getDb(), filters);
  // BOM so Excel opens Arabic names correctly.
  return new Response(`﻿${ordersToCsv(rows)}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="ibada-orders-${beirutDateKey(new Date())}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
