import type { Metadata } from 'next';
import { Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { PushToggle } from '@/components/admin/push-toggle';
import { RemoveDeviceButton } from '@/components/admin/remove-device-button';
import { AdminCard } from '@/components/admin/ui';
import { getEnv } from '@/env';
import { formatBeirut } from '@/lib/dates';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { listSubscriptions } from '@/server/push';

export const metadata: Metadata = { title: 'Notifications' };

function deviceName(ua: string | null): string {
  if (!ua) return 'Unknown device';
  if (/iPhone|iPad/.test(ua)) return 'iPhone / iPad';
  if (/Android/.test(ua)) return 'Android phone';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  return 'Browser';
}

export default async function NotificationsPage() {
  const { user } = await requireAdmin('notifications');
  const devices = await listSubscriptions(getDb(), user.id);
  return (
    <>
      <PageHeader title="Notifications" description="Get a notification on your phone the moment a new order arrives." />
      <div className="space-y-5">
        <AdminCard title="This device">
          <PushToggle vapidPublicKey={getEnv().VAPID_PUBLIC_KEY ?? null} />
        </AdminCard>
        <AdminCard title={`Your devices (${devices.length})`}>
          {devices.length === 0 ? (
            <p className="text-sm text-slate-500">No devices yet. Enable notifications on your phone to receive new orders.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {devices.map((d) => (
                <li key={d.endpoint} className="flex items-center gap-3 py-3">
                  <Smartphone className="size-5 text-slate-400" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy">{deviceName(d.userAgent)}</p>
                    <p className="text-xs text-slate-500">
                      Added {formatBeirut(new Date(d.createdAt), 'date')}
                      {d.lastSuccessAt ? ` · last notified ${formatBeirut(new Date(d.lastSuccessAt), 'datetime')}` : ''}
                    </p>
                  </div>
                  <RemoveDeviceButton endpoint={d.endpoint} />
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </>
  );
}
