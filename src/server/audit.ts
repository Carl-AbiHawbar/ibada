import { hashIp } from './crypto';
import type { Db } from './db/client';
import { auditLog } from './db/schema';

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
