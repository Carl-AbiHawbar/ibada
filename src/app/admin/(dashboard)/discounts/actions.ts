'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addDays, beirutDayStart } from '@/lib/dates';
import { audit } from '@/server/audit';
import { getDb } from '@/server/db/client';
import { saveDiscount, setDiscountActive } from '@/server/discounts';
import { requireAdmin } from '@/server/next/admin-session';
import { requestIp } from '@/server/next/request';

export type DiscountFormValues = {
  code: string;
  type: 'percent' | 'fixed';
  amount: string; // percent, or dollars for fixed
  minSubtotal: string; // dollars, optional
  usageLimit: string; // optional
  oncePerPhone: boolean;
  startsOn: string; // YYYY-MM-DD (Beirut), optional
  endsOn: string; // YYYY-MM-DD (Beirut, inclusive), optional
  active: boolean;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const num = (s: string) => (s.trim() === '' ? null : Number(s));

export async function saveDiscountAction(
  id: string | null,
  v: DiscountFormValues,
): Promise<{ ok: true } | { ok: false; fieldErrors: Record<string, string> }> {
  const { user } = await requireAdmin('discounts');
  if (id && !z.uuid().safeParse(id).success) return { ok: false, fieldErrors: { form: 'Invalid discount' } };
  const amount = num(String(v.amount));
  const minSubtotal = num(String(v.minSubtotal));
  const usageLimit = num(String(v.usageLimit));
  const input = {
    code: String(v.code),
    type: v.type,
    value: amount === null ? 0 : v.type === 'percent' ? Math.round(amount) : Math.round(amount * 100),
    minSubtotalCents: minSubtotal === null ? null : Math.round(minSubtotal * 100),
    usageLimit: usageLimit === null ? null : Math.round(usageLimit),
    oncePerPhone: Boolean(v.oncePerPhone),
    // Dates are Beirut calendar days; the end day is included.
    startsAt: DATE.test(v.startsOn) ? beirutDayStart(v.startsOn) : null,
    endsAt: DATE.test(v.endsOn) ? beirutDayStart(addDays(v.endsOn, 1)) : null,
    active: Boolean(v.active),
  };
  const r = await saveDiscount(getDb(), { id: id ?? undefined, input });
  if (!r.ok) {
    const fe = r.fieldErrors ?? {};
    return {
      ok: false,
      fieldErrors: Object.fromEntries(
        Object.entries(fe).map(([k, m]) => [
          ({ value: 'amount', minSubtotalCents: 'minSubtotal', startsAt: 'startsOn', endsAt: 'endsOn' } as Record<string, string>)[k] ?? k,
          m,
        ]),
      ),
    };
  }
  await audit(getDb(), {
    userId: user.id,
    action: id ? 'discount.updated' : 'discount.created',
    entity: 'discount',
    entityId: r.id,
    summary: `${id ? 'Updated' : 'Created'} code ${input.code.toUpperCase()}`,
    ip: await requestIp(),
  });
  revalidatePath('/admin/discounts');
  return { ok: true };
}

export async function toggleDiscountAction(id: string, active: boolean): Promise<void> {
  const { user } = await requireAdmin('discounts');
  if (!z.uuid().safeParse(id).success) return;
  await setDiscountActive(getDb(), id, Boolean(active));
  await audit(getDb(), {
    userId: user.id,
    action: 'discount.updated',
    entity: 'discount',
    entityId: id,
    summary: active ? 'Activated a code' : 'Deactivated a code',
    ip: await requestIp(),
  });
  revalidatePath('/admin/discounts');
}
