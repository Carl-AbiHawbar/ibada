'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __ibadaTurnstileLoading?: Promise<void>;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  window.__ibadaTurnstileLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('turnstile failed to load'));
    document.head.appendChild(s);
  });
  return window.__ibadaTurnstileLoading;
}

export type TurnstileHandle = { reset: () => void };

/** Cloudflare Turnstile bot check; invisible unless Cloudflare needs an interaction. */
export const Turnstile = forwardRef<
  TurnstileHandle,
  { siteKey: string; locale: 'en' | 'ar'; onToken: (token: string) => void; onExpire: () => void }
>(function Turnstile({ siteKey, locale, onToken, onExpire }, ref) {
  const el = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const handlers = useRef({ onToken, onExpire });
  handlers.current = { onToken, onExpire };

  useImperativeHandle(ref, () => ({
    reset: () => {
      handlers.current.onExpire();
      if (widget.current) window.turnstile?.reset(widget.current);
    },
  }));

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !el.current || !window.turnstile) return;
        widget.current = window.turnstile.render(el.current, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          language: locale,
          callback: (token: string) => handlers.current.onToken(token),
          'expired-callback': () => handlers.current.onExpire(),
          'error-callback': () => handlers.current.onExpire(),
        });
      })
      .catch(() => handlers.current.onExpire());
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, locale]);

  return <div ref={el} className="flex justify-center empty:hidden" />;
});
