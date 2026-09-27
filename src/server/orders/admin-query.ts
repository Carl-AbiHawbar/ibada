import { and, asc, count, desc, eq, gte, ilike, inArray, lt, or, type SQL } from 'drizzle-orm';
import type { OrderStatus } from '@/lib/order-status';
import { normalizeLebanesePhone } from '@/lib/phone';
import type { Db } from '../db/client';
import { customers, orderEvents, orderItems, orders, user } from '../db/schema';

export const ORDERS_PAGE_SIZE = 25;

export type OrderFilter = { status?: OrderStatus; q?: string; from?: Date; to?: Date };

export type OrderRow = {
  id: string;
  number: number;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: 'pending' | 'paid';
  name: string;
  phone: string;
  governorate: string;
  district: string;
  totalCents: number;
  itemsSummary: string;
};

function whereFor(f: OrderFilter): SQL | undefined {
  const conds: (SQL | undefined)[] = [];
  if (f.status) conds.push(eq(orders.status, f.status));
  if (f.from) conds.push(gte(orders.createdAt, f.from));
  if (f.to) conds.push(lt(orders.createdAt, f.to));
  const q = f.q?.trim();
  if (q) {
    const alts: SQL[] = [ilike(orders.name, `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`)];
    if (/^\d{4,6}$/.test(q)) alts.push(eq(orders.number, Number(q)));
    const phone = normalizeLebanesePhone(q);
    if (phone) alts.push(eq(orders.phone, phone));
    conds.push(or(...alts));
  }
  return and(...conds);
}

async function itemSummaries(db: Db, orderIds: string[], sep: string, times: string): Promise<Map<string, string>> {
  if (orderIds.length === 0) return new Map();
  const items = await db
    .select({ orderId: orderItems.orderId, name: orderItems.bundleNameEn, quantity: orderItems.quantity })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(asc(orderItems.id));
  const map = new Map<string, string[]>();
  for (const i of items) map.set(i.orderId, [...(map.get(i.orderId) ?? []), `${i.name} ${times}${i.quantity}`]);
  return new Map([...map].map(([k, v]) => [k, v.join(sep)]));
}

export async function listOrders(db: Db, f: OrderFilter & { page: number }): Promise<{ rows: OrderRow[]; total: number }> {
  const where = whereFor(f);
  const page = Math.max(1, Math.floor(f.page) || 1);
  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt), desc(orders.number))
      .limit(ORDERS_PAGE_SIZE)
      .offset((page - 1) * ORDERS_PAGE_SIZE),
    db.select({ n: count() }).from(orders).where(where),
  ]);
  const summaries = await itemSummaries(
    db,
    rows.map((r) => r.id),
    ', ',
    '×',
  );
  return {
    total: totalRow?.n ?? 0,
    rows: rows.map((o) => ({
      id: o.id,
      number: o.number,
      createdAt: o.createdAt.toISOString(),
      status: o.status,
      paymentStatus: o.paymentStatus,
      name: o.name,
      phone: o.phone,
      governorate: o.governorate,
      district: o.district,
      totalCents: o.totalCents,
      itemsSummary: summaries.get(o.id) ?? '',
    })),
  };
}

export async function getOrderDetail(db: Db, id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;
  const [items, evs, [customer]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.id)),
    db
      .select({
        id: orderEvents.id,
        type: orderEvents.type,
        fromStatus: orderEvents.fromStatus,
        toStatus: orderEvents.toStatus,
        note: orderEvents.note,
        createdAt: orderEvents.createdAt,
        actorName: user.name,
      })
      .from(orderEvents)
      .leftJoin(user, eq(user.id, orderEvents.userId))
      .where(eq(orderEvents.orderId, id))
      .orderBy(asc(orderEvents.createdAt)),
    db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1),
  ]);
  return {
    order,
    items,
    events: evs.map((e) => ({ ...e, actorName: e.actorName ?? null })),
    customer: customer
      ? {
          id: customer.id,
          orderCount: customer.orderCount,
          totalSpentCents: customer.totalSpentCents,
          blocked: customer.blocked,
          blockedReason: customer.blockedReason,
        }
      : null,
  };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderDetail>>>;

export type OrderExportRow = {
  number: number;
  createdAt: Date;
  status: OrderStatus;
  name: string;
  phone: string;
  governorate: string;
  district: string;
  town: string;
  addressLine: string;
  landmark: string;
  notes: string;
  items: string;
  totalCents: number;
};

export const EXPORT_MAX_ROWS = 5000;

export async function getOrdersForExport(db: Db, f: OrderFilter): Promise<OrderExportRow[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(whereFor(f))
    .orderBy(desc(orders.createdAt))
    .limit(EXPORT_MAX_ROWS);
  const summaries = await itemSummaries(
    db,
    rows.map((r) => r.id),
    '; ',
    'x',
  );
  return rows.map((o) => ({
    number: o.number,
    createdAt: o.createdAt,
    status: o.status,
    name: o.name,
    phone: o.phone,
    governorate: o.governorate,
    district: o.district,
    town: o.town,
    addressLine: o.addressLine,
    landmark: o.landmark,
    notes: o.notes,
    items: summaries.get(o.id) ?? '',
    totalCents: o.totalCents,
  }));
}
