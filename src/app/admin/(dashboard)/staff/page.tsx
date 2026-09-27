import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/page-header';
import { StaffManager } from '@/components/admin/staff-manager';
import { listPendingInvites, listStaff } from '@/server/admin/staff';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'Staff' };

export default async function StaffPage() {
  const { user } = await requireAdmin('staff');
  const db = getDb();
  const [staff, invites] = await Promise.all([listStaff(db), listPendingInvites(db)]);
  return (
    <>
      <PageHeader title="Staff" description="Everyone signs in with a password and an authenticator app." />
      <StaffManager
        me={user.id}
        staff={staff.map((s) => ({ id: s.id, name: s.name, email: s.email, role: s.role, active: s.active, twoFactorEnabled: s.twoFactorEnabled }))}
        invites={invites.map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expiresAt.toISOString() }))}
      />
    </>
  );
}
