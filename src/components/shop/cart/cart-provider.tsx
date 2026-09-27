'use client';

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { CartLine } from '@/lib/cart-schema';
import { createCartStore, type CartStore } from '@/lib/cart-store';
import { track } from '@/lib/track';

type CartCtx = {
  lines: CartLine[];
  count: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  addToCart: (bundleId: string, quantity: number) => void;
  setQuantity: CartStore['setQuantity'];
  remove: CartStore['remove'];
  replace: CartStore['replace'];
  clear: CartStore['clear'];
};

const Ctx = createContext<CartCtx | null>(null);
const EMPTY: CartLine[] = [];
const memoryStorage = { getItem: () => null, setItem: () => {} };

export function CartProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createCartStore(typeof window === 'undefined' ? memoryStorage : window.localStorage));
  // Server snapshot is always empty, so hydration never mismatches the saved cart.
  const lines = useSyncExternalStore(store.subscribe, store.getLines, () => EMPTY);
  const [open, setOpen] = useState(false);

  const addToCart = useCallback(
    (bundleId: string, quantity: number) => {
      store.add(bundleId, quantity);
      setOpen(true);
      track('add_to_cart');
    },
    [store],
  );

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      open,
      setOpen,
      addToCart,
      setQuantity: store.setQuantity,
      remove: store.remove,
      replace: store.replace,
      clear: store.clear,
    }),
    [lines, open, addToCart, store],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
