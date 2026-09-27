'use client';

import { useEffect, useState } from 'react';
import { Share, X } from 'lucide-react';

/** Registers the admin service worker (push notifications + installable app). */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }).catch(() => {});
  }, []);
  return null;
}

const DISMISS_KEY = 'ibada_install_hint_dismissed';

/** iPhone only allows web push for apps added to the home screen; explain how once. */
export function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    } catch {}
    // One-time read of browser-only state after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(ios && !standalone && !dismissed);
  }, []);

  if (!show) return null;
  return (
    <div className="fixed inset-x-3 bottom-24 z-50 flex items-start gap-3 rounded-2xl bg-navy p-4 text-sm text-white shadow-2xl lg:hidden">
      <Share className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p className="flex-1">
        Install: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>, then open IBADA from your home screen to enable notifications.
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, '1');
          } catch {}
          setShow(false);
        }}
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
