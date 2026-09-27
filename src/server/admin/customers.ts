import { count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { normalizeLebanesePhone } from '@/lib/phone';
import type { Db } from '../db/client';
import { customers, orders } from '../db/schema';

const PAGE = 25;
export type CustomerSort = 'recent' | 'spent' | 'orders';

export async function listCustomers(db: Db, f: { q?: string; sort: CustomerSort; page: number }) {
  const q = f.q?.trim();
  let where: SQL | undefined;
  if (q) {
    const phone = normalizeLebanesePhone(q);
    where = or(ilike(customers.name, `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`), phone ? eq(customers.phone, phone) : undefined);
  }
  const order =
    f.sort === 'spent'
      ? [desc(customers.totalSpentCents), desc(customers.lastOrderAt)]
      : f.sort === 'orders'
        ? [desc(customers.orderCount), desc(customers.lastOrderAt)]
        : [sql`${customers.lastOrderAt} DESC NULLS LAST`];
  const page = Math.max(1, f.page);
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(customers)
      .where(where)
      .orderBy(...order)
      .limit(PAGE)
      .offset((page - 1) * PAGE),
    db.select({ n: count() }).from(customers).where(where),
  ]);
  return { rows, total: total?.n ?? 0, pageSize: PAGE };
}

export async function getCustomer(db: Db, id: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, id));
  if (!customer) return null;
  const list = await db
    .select({ id: orders.id, number: orders.number, status: orders.status, totalCents: orders.totalCents, createdAt: orders.createdAt })
    .from(orders)
    .where(eq(orders.customerId, id))
    .orderBy(desc(orders.createdAt))
    .limit(100);
  return { customer, orders: list };
}

export async function setCustomerBlocked(db: Db, a: { id: string; blocked: boolean; reason?: string }): Promise<void> {
  await db
    .update(customers)
    .set({ blocked: a.blocked, blockedReason: a.blocked ? (a.reason?.trim().slice(0, 200) || null) : null })
    .where(eq(customers.id, a.id));
}

export async function setCustomerNotes(db: Db, a: { id: string; notes: string }): Promise<void> {
  await db.update(customers).set({ notes: a.notes.slice(0, 2000) }).where(eq(customers.id, a.id));
}
