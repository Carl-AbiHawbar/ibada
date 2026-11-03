import { BottomTabs, Sidebar, TopBar } from '@/components/admin/admin-nav';
import { InstallHint, ServiceWorkerRegistrar } from '@/components/admin/pwa';
import { can } from '@/lib/permissions';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { orderStatusCounts } from '@/server/orders/admin-query';

export default async function DashboardLayout({ children }: LayoutProps<'/admin'>) {
  const { user } = await requireAdmin('home');
  const newOrders = can(user.role, 'orders') ? (await orderStatusCounts(getDb())).new : 0;
  return (
    <div className="min-h-dvh bg-[#f1f1f1] text-[#303030]">
      <TopBar user={user} />
      <div className="lg:grid lg:grid-cols-[240px_1fr]">
        <Sidebar user={user} newOrders={newOrders} />
        <main className="mx-auto w-full min-w-0 max-w-[1200px] px-3 pb-28 pt-4 sm:px-5 lg:px-8 lg:pb-12 lg:pt-6">{children}</main>
      </div>
      <BottomTabs user={user} newOrders={newOrders} />
      <InstallHint />
      <ServiceWorkerRegistrar />
    </div>
  );
}
