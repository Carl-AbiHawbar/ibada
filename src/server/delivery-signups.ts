import { desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { formatBeirut } from '@/lib/dates';
import { PEST_KEYS, PEST_LABELS } from '@/lib/pests';
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
    .transform((v) => v || undefined)
    .pipe(z.email('invalid_email').optional())
    .optional(),
  phone: z
    .string()
    .max(32, 'invalid_phone')
    .transform((v, ctx) => {
      const e164 = normalizeLebanesePhone(v);
      if (!e164) ctx.addIssue({ code: 'custom', message: 'invalid_phone' });
      return e164 ?? '';
    }),
  marketingOptIn: z.boolean().default(false),
  pests: z
    .array(z.enum(PEST_KEYS, { error: 'invalid_pests' }), { error: 'invalid_pests' })
    .max(PEST_KEYS.length, 'invalid_pests')
    .default([])
    .transform((v) => PEST_KEYS.filter((k) => v.includes(k))),
  locale: z.enum(['en', 'ar']).default('en'),
});

export type SaveSignupResult = { ok: true; id: string } | { ok: false; fieldErrors: Record<string, string> };

/** Save (or update, by phone) a free-delivery signup. */
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
    .values({ ...v, email: v.email ?? null, ipHash: ctx.ipHash, createdAt: ctx.now, updatedAt: ctx.now })
    .onConflictDoUpdate({
      target: deliverySignups.phone,
      set: {
        name: v.name,
        // A later signup without an email keeps the one we already have.
        email: sql`coalesce(excluded.email, ${deliverySignups.email})`,
        marketingOptIn: v.marketingOptIn,
        pests: v.pests,
        locale: v.locale,
        updatedAt: ctx.now,
      },
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
  const header = 'Date,Name,Phone,Email,Pests,WhatsApp offers,Language';
  const lines = rows.map((r) =>
    [
      formatBeirut(r.createdAt, 'datetime'),
      r.name,
      formatLebanesePhone(r.phone),
      r.email ?? '',
      r.pests.map((p) => PEST_LABELS[p as keyof typeof PEST_LABELS] ?? p).join('; '),
      r.marketingOptIn ? 'Yes' : 'No',
      r.locale,
    ]
      .map(cell)
      .join(','),
  );
  return [header, ...lines].join('\r\n');
}
