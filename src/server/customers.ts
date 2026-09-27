import { sql } from 'drizzle-orm';
import type { Db } from './db/client';
import { customers } from './db/schema';

/** Create or update the customer behind an order (matched by E.164 phone). */
export async function upsertCustomerForOrder(
  db: Db,
  a: { phone: string; name: string; now: Date },
): Promise<{ id: string; blocked: boolean }> {
  const [row] = await db
    .insert(customers)
    .values({ phone: a.phone, name: a.name, orderCount: 1, lastOrderAt: a.now })
    .onConflictDoUpdate({
      target: customers.phone,
      set: {
        name: a.name,
        orderCount: sql`${customers.orderCount} + 1`,
        lastOrderAt: a.now,
      },
    })
    .returning({ id: customers.id, blocked: customers.blocked });
  if (!row) throw new Error('customer upsert returned nothing');
  return row;
}
