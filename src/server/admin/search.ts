import { desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { navItemsFor } from '@/components/admin/nav-items';
import type { OrderStatus } from '@/lib/order-status';
import { can, type StaffRole } from '@/lib/permissions';
import { normalizeLebanesePhone } from '@/lib/phone';
import type { Db } from '../db/client';
import { customers, orders, products } from '../db/schema';

const LIMIT = 5;

export type AdminSearchResult = {
  orders: { id: string; number: number; name: string; status: OrderStatus; totalCents: number }[];
  customers: { id: string; name: string; phone: string; orderCount: number }[];
  products: { id: string; nameEn: string; status: 'active' | 'draft' }[];
  pages: { href: string; label: string }[];
};

const EMPTY: AdminSearchResult = { orders: [], customers: [], products: [], pages: [] };
const like = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Command-palette search: a few matches per kind, limited to the areas this role may open. */
export async function adminSearch(db: Db, raw: string, role: StaffRole): Promise<AdminSearchResult> {
  const q = raw.trim().slice(0, 80);
  if (!q) return EMPTY;
  const phone = normalizeLebanesePhone(q);

  const orderAlts: (SQL | undefined)[] = [ilike(orders.name, like(q))];
  if (/^#?\d{1,7}$/.test(q)) orderAlts.push(eq(orders.number, Number(q.replace('#', ''))));
  if (phone) orderAlts.push(eq(orders.phone, phone));

  const [orderRows, customerRows, productRows] = await Promise.all([
    can(role, 'orders')
      ? db
          .select({ id: orders.id, number: orders.number, name: orders.name, status: orders.status, totalCents: orders.totalCents })
          .from(orders)
          .where(or(...orderAlts))
          .orderBy(desc(orders.createdAt))
          .limit(LIMIT)
      : [],
    can(role, 'customers')
      ? db
          .select({ id: customers.id, name: customers.name, phone: customers.phone, orderCount: customers.orderCount })
          .from(customers)
          .where(or(ilike(customers.name, like(q)), phone ? eq(customers.phone, phone) : undefined))
          .orderBy(desc(customers.lastOrderAt))
          .limit(LIMIT)
      : [],
    can(role, 'products')
      ? db
          .select({ id: products.id, nameEn: products.nameEn, status: products.status })
          .from(products)
          .where(or(ilike(products.nameEn, like(q)), ilike(products.nameAr, like(q))))
          .limit(LIMIT)
      : [],
  ]);

  const needle = q.toLowerCase();
  const pages = navItemsFor(role)
    .filter((i) => i.label.toLowerCase().includes(needle))
    .map((i) => ({ href: i.href, label: i.label }));

  return { orders: orderRows, customers: customerRows, products: productRows, pages };
}
