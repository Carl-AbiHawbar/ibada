import type { Metadata } from 'next';
import { AuthCard } from '@/components/admin/auth/auth-card';
import { AcceptInviteForm } from '@/components/admin/auth/accept-invite-form';
import { findInvite } from '@/server/auth/invites';
import { getDb } from '@/server/db/client';

export const metadata: Metadata = { title: 'Join the IBADA team' };
export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: PageProps<'/admin/invite/[token]'>) {
  const { token } = await params;
  const invite = await findInvite(getDb(), token);
  const problem = !invite
    ? 'This invite link is not valid.'
    : invite.acceptedAt
      ? 'This invite link was already used.'
      : invite.expiresAt < new Date()
        ? 'This invite link has expired. Ask the owner for a new one.'
        : null;

  return (
    <AuthCard title="Join the IBADA team" subtitle="Create your admin account.">
      {problem || !invite ? <p className="text-sm text-red-600">{problem}</p> : <AcceptInviteForm token={token} email={invite.email} />}
    </AuthCard>
  );
}
