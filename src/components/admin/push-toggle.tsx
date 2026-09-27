'use client';

import { useEffect, useState, useTransition } from 'react';
import { BellOff, BellRing, CheckCircle2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { sendTestAction, subscribeAction, unsubscribeAction } from '@/app/admin/(dashboard)/notifications/actions';
import { AdminButton } from '@/components/admin/ui';

type State = 'loading' | 'unsupported' | 'denied' | 'off' | 'on';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration() {
  return navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }).then(() => navigator.serviceWorker.ready);
}

export function PushToggle({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [state, setState] = useState<State>('loading');
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!vapidPublicKey || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') return setState('denied');
    registration()
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setEndpoint(sub?.endpoint ?? null);
        setState(sub ? 'on' : 'off');
      })
      .catch(() => setState('off'));
  }, [vapidPublicKey]);

  const enable = () =>
    start(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      try {
        const reg = await registration();
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!) }));
        const json = sub.toJSON();
        const r = await subscribeAction({ endpoint: json.endpoint, keys: json.keys });
        if (!r.ok) throw new Error('rejected');
        setEndpoint(sub.endpoint);
        setState('on');
        toast.success('Notifications are on for this device');
      } catch {
        toast.error('Could not turn on notifications on this device');
      }
    });

  const disable = () =>
    start(async () => {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setEndpoint(null);
      setState('off');
    });

  const test = () =>
    start(async () => {
      const r = await sendTestAction();
      if (r.sent > 0) toast.success(`Test sent to ${r.sent} device${r.sent === 1 ? '' : 's'}`);
      else toast.error('No device received the test');
    });

  if (state === 'loading') return <div className="h-11 w-64 animate-pulse rounded-xl bg-slate-100" />;
  if (state === 'unsupported')
    return (
      <p className="flex items-start gap-2 text-sm text-slate-600">
        <BellOff className="mt-0.5 size-4 shrink-0" />
        {vapidPublicKey
          ? 'This browser cannot receive notifications. On iPhone, add IBADA to your home screen first (Share → Add to Home Screen), then open it from there.'
          : 'Notifications are not configured on the server yet (VAPID keys missing).'}
      </p>
    );
  if (state === 'denied')
    return (
      <p className="flex items-start gap-2 text-sm text-slate-600">
        <BellOff className="mt-0.5 size-4 shrink-0" />
        Notifications are blocked for this site. Allow them in your browser or phone settings, then reload this page.
      </p>
    );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {state === 'on' ? (
        <>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-green-700" data-endpoint={endpoint ?? ''}>
            <CheckCircle2 className="size-5" /> On for this device
          </span>
          <AdminButton variant="secondary" onClick={test} disabled={pending}>
            <Send /> Send test notification
          </AdminButton>
          <AdminButton variant="ghost" onClick={disable} disabled={pending}>
            Turn off on this device
          </AdminButton>
        </>
      ) : (
        <AdminButton onClick={enable} disabled={pending}>
          <BellRing /> Enable notifications on this device
        </AdminButton>
      )}
    </div>
  );
}
