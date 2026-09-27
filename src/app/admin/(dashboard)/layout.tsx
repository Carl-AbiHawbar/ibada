import { requireAdmin } from '@/server/next/admin-session';

// Replaced by the full admin shell in Task 15.
export default async function DashboardLayout({ children }: LayoutProps<'/admin'>) {
  await requireAdmin('home');
  return <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>;
}
