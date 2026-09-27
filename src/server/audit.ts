import { and, count, desc, eq } from 'drizzle-orm';
import { hashIp } from './crypto';
import type { Db } from './db/client';
import { auditLog, user } from './db/schema';

export type AuditEntry = {
  userId: string | null;
  /** `entity.verb`, e.g. `order.status_changed` */
  action: string;
  entity: string;
  entityId?: string;
  summary: string;
  ip: string | null;
};

/** Record an admin change in the activity log. */
export async function audit(db: Db, e: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    userId: e.userId,
    action: e.action,
    entity: e.entity,
    entityId: e.entityId ?? null,
    summary: e.summary.slice(0, 500),
    ipHash: e.ip ? hashIp(e.ip) : null,
  });
}

export async function listAudit(db: Db, f: { userId?: string; entity?: string; page: number }) {
  const size = 50;
  const where = and(f.userId ? eq(auditLog.userId, f.userId) : undefined, f.entity ? eq(auditLog.entity, f.entity) : undefined);
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        summary: auditLog.summary,
        createdAt: auditLog.createdAt,
        actorName: user.name,
      })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.userId))
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(size)
      .offset((Math.max(1, f.page) - 1) * size),
    db.select({ n: count() }).from(auditLog).where(where),
  ]);
  return { rows, total: total?.n ?? 0, pageSize: size };
}
