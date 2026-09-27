import type { Metadata } from 'next';
import { BackupCodesCard, ChangePasswordCard, SessionsCard } from '@/components/admin/account-security';
import { PageHeader } from '@/components/admin/page-header';
import { requireAdmin } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'Account' };

export default async function AccountPage() {
  const { user } = await requireAdmin('account');
  return (
    <>
      <PageHeader title="Account" description={`${user.name} · ${user.email}`} />
      <div className="space-y-5">
        <ChangePasswordCard />
        <BackupCodesCard />
        <SessionsCard />
      </div>
    </>
  );
}
