import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/admin/auth/auth-card';
import { SetupTwoFactor } from '@/components/admin/auth/setup-two-factor';
import { requireSignedIn } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'Set up two-step sign-in' };

export default async function SetupTwoFactorPage() {
  const { user } = await requireSignedIn();
  if (user.twoFactorEnabled) redirect('/admin');
  return (
    <AuthCard title="Set up two-step sign-in" subtitle={user.email}>
      <SetupTwoFactor />
    </AuthCard>
  );
}
