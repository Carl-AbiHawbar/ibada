import type { Metadata } from 'next';
import { SignOutButton } from '@/components/admin/auth/sign-out-button';
import { requireAdmin } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'Home' };

// Replaced by the sales dashboard in Task 20.
export default async function AdminHome() {
  const { user } = await requireAdmin('home');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-navy">Welcome, {user.name}</h1>
      <SignOutButton />
    </div>
  );
}
