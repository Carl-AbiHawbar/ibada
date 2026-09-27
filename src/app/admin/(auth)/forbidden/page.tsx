import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { AuthCard } from '@/components/admin/auth/auth-card';
import { requireSignedIn } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'No access' };

export default async function ForbiddenPage() {
  await requireSignedIn();
  return (
    <AuthCard title="You don't have access to this page.">
      <div className="flex flex-col items-center gap-4 text-center">
        <ShieldX className="size-10 text-slate-400" aria-hidden />
        <p className="text-sm text-slate-600">Ask the shop owner if you need access to this area.</p>
        <Link href="/admin" className="font-semibold text-blue hover:underline">
          Back to the dashboard
        </Link>
      </div>
    </AuthCard>
  );
}
