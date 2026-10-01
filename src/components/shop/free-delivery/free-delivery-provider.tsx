'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { FreeDeliveryOffer } from './free-delivery-offer';

// UI hint only: the server decides from its signed httpOnly cookie.
const CLAIMED_KEY = 'ibada:free-delivery';
// Set once the form has opened by itself, so it only ever does that one time per browser.
const POPUP_KEY = 'ibada:free-delivery-popup';
const POPUP_DELAY_MS = 5000;
// Never interrupt someone who is checking out or looking at an order.
const NO_POPUP = /\/(checkout|order|track)(\/|$)/;
const listeners = new Set<() => void>();

function readClaimed(): boolean {
  try {
    return window.localStorage.getItem(CLAIMED_KEY) === '1';
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

type FreeDeliveryCtx = {
  /** Delivery fee the offer saves; 0 means delivery is free for everyone and the offer is hidden. */
  feeCents: number;
  claimed: boolean;
  /** Bumps after a claim so carts and checkout re-price. */
  version: number;
  openForm: () => void;
};

const Ctx = createContext<FreeDeliveryCtx | null>(null);

export function FreeDeliveryProvider({
  feeCents,
  siteKey,
  children,
}: {
  feeCents: number;
  siteKey: string;
  children: ReactNode;
}) {
  const claimed = useSyncExternalStore(subscribe, readClaimed, () => false);
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    if (feeCents <= 0 || claimed || NO_POPUP.test(pathname)) return;
    try {
      if (window.localStorage.getItem(POPUP_KEY) === '1') return;
    } catch {
      return; // No storage: we could not remember showing it, so never show it.
    }
    let timer = 0;
    const tryOpen = () => {
      // Wait while the cart or another dialog is open.
      if (document.querySelector('[role="dialog"]')) {
        timer = window.setTimeout(tryOpen, 2000);
        return;
      }
      try {
        window.localStorage.setItem(POPUP_KEY, '1');
      } catch {
        return;
      }
      setOpen(true);
    };
    timer = window.setTimeout(tryOpen, POPUP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [feeCents, claimed, pathname]);

  const onClaimed = useCallback(() => {
    try {
      window.localStorage.setItem(CLAIMED_KEY, '1');
    } catch {
      // Private mode: the server cookie still grants free delivery.
    }
    listeners.forEach((l) => l());
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo<FreeDeliveryCtx>(
    () => ({ feeCents, claimed, version, openForm: () => setOpen(true) }),
    [feeCents, claimed, version],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {feeCents > 0 && (
        <FreeDeliveryOffer
          siteKey={siteKey}
          showButton={!claimed}
          open={open}
          onOpenChange={setOpen}
          onClaimed={onClaimed}
        />
      )}
    </Ctx.Provider>
  );
}

const FALLBACK: FreeDeliveryCtx = { feeCents: 0, claimed: false, version: 0, openForm: () => {} };

export function useFreeDelivery(): FreeDeliveryCtx {
  return useContext(Ctx) ?? FALLBACK;
}
