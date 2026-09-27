import { BottomTabs, MobileTopBar, Sidebar } from '@/components/admin/admin-nav';
import { InstallHint, ServiceWorkerRegistrar } from '@/components/admin/pwa';
import { requireAdmin } from '@/server/next/admin-session';

export default async function DashboardLayout({ children }: LayoutProps<'/admin'>) {
  const { user } = await requireAdmin('home');
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <Sidebar user={user} />
      <div className="flex min-h-dvh min-w-0 flex-col">
        <MobileTopBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>
      </div>
      <BottomTabs user={user} />
      <InstallHint />
      <ServiceWorkerRegistrar />
    </div>
  );
}
