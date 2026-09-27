import type { Metadata } from 'next';
import { DiscountsManager } from '@/components/admin/discounts/discounts-manager';
import { PageHeader } from '@/components/admin/page-header';
import { addDays, beirutDateKey } from '@/lib/dates';
import { getDb } from '@/server/db/client';
import { listDiscounts } from '@/server/discounts';
import { requireAdmin } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'Discounts' };

export default async function DiscountsPage() {
  await requireAdmin('discounts');
  const rows = await listDiscounts(getDb());
  return (
    <>
      <PageHeader title="Discounts" description="Codes customers can enter at checkout. Checked again when the order is placed." />
      <DiscountsManager
        rows={rows.map((d) => ({
          id: d.id,
          code: d.code.toUpperCase(),
          type: d.type,
          value: d.value,
          minSubtotalCents: d.minSubtotalCents,
          usageLimit: d.usageLimit,
          usedCount: d.usedCount,
          oncePerPhone: d.oncePerPhone,
          startsOn: d.startsAt ? beirutDateKey(d.startsAt) : '',
          // Stored as the exclusive end instant; show the last included day.
          endsOn: d.endsAt ? addDays(beirutDateKey(d.endsAt), -1) : '',
          active: d.active,
        }))}
      />
    </>
  );
}
