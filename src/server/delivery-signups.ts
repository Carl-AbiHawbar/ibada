import { desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { formatBeirut } from '@/lib/dates';
import { formatLebanesePhone, normalizeLebanesePhone } from '@/lib/phone';
import type { Db } from './db/client';
import { deliverySignups } from './db/schema';
import { fieldErrorsOf } from './orders/schema';

export const deliverySignupSchema = z.object({
  name: z.string().trim().min(1, 'required').max(80, 'too_long'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, 'invalid_email')
    .pipe(z.email('invalid_email')),
  phone: z
    .string()
    .max(32, 'invalid_phone')
    .transform((v, ctx) => {
      const e164 = normalizeLebanesePhone(v);
      if (!e164) ctx.addIssue({ code: 'custom', message: 'invalid_phone' });
      return e164 ?? '';
    }),
  marketingOptIn: z.boolean().default(false),
  locale: z.enum(['en', 'ar']).default('en'),
});

export type SaveSignupResult = { ok: true; id: string } | { ok: false; fieldErrors: Record<string, string> };

/** Save (or update, by email) a free-delivery signup. */
export async function saveDeliverySignup(
  db: Db,
  input: unknown,
  ctx: { ipHash: string; now: Date },
): Promise<SaveSignupResult> {
  const parsed = deliverySignupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const v = parsed.data;
  const [row] = await db
    .insert(deliverySignups)
    .values({ ...v, ipHash: ctx.ipHash, createdAt: ctx.now, updatedAt: ctx.now })
    .onConflictDoUpdate({
      target: deliverySignups.email,
      set: { name: v.name, phone: v.phone, marketingOptIn: v.marketingOptIn, locale: v.locale, updatedAt: ctx.now },
    })
    .returning({ id: deliverySignups.id });
  return { ok: true, id: row!.id };
}

export type DeliverySignupRow = typeof deliverySignups.$inferSelect;

export async function listDeliverySignups(db: Db, a: { limit: number; offset: number }): Promise<DeliverySignupRow[]> {
  return db.select().from(deliverySignups).orderBy(desc(deliverySignups.createdAt)).limit(a.limit).offset(a.offset);
}

export async function countDeliverySignups(db: Db): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(deliverySignups);
  return row?.n ?? 0;
}

function cell(value: string): string {
  let v = value;
  // Neutralize spreadsheet formulas typed into the form.
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** RFC 4180 CSV (CRLF) for mailing tools and spreadsheets. */
export function deliverySignupsToCsv(rows: DeliverySignupRow[]): string {
  const header = 'Date,Name,Email,Phone,Offers OK,Language';
  const lines = rows.map((r) =>
    [
      formatBeirut(r.createdAt, 'datetime'),
      r.name,
      r.email,
      formatLebanesePhone(r.phone),
      r.marketingOptIn ? 'Yes' : 'No',
      r.locale,
    ]
      .map(cell)
      .join(','),
  );
  return [header, ...lines].join('\r\n');
}
