'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MAX_LINE_QUANTITY } from '@/lib/cart-schema';
import { track } from '@/lib/track';
import type { BundleView, ProductView } from '@/server/catalog';
import { useCart } from '../cart/cart-provider';

type SelectionCtx = {
  product: ProductView;
  bundle: BundleView;
  select: (bundleId: string) => void;
  quantity: number;
  setQuantity: (n: number) => void;
  addToCart: () => void;
  /** Callback ref for the main add-to-cart button; the sticky bar watches it. */
  registerMainButton: (el: HTMLButtonElement | null) => void;
  mainButton: HTMLButtonElement | null;
};

const Ctx = createContext<SelectionCtx | null>(null);

export function ProductSelectionProvider({ product, children }: { product: ProductView; children: ReactNode }) {
  const { addToCart: addLine } = useCart();
  const initial = product.bundles.find((b) => b.isDefault) ?? product.bundles[0]!;
  const [bundleId, setBundleId] = useState(initial.id);
  const [quantity, setQty] = useState(1);
  const [mainButton, registerMainButton] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    track('view_product');
  }, []);

  const bundle = product.bundles.find((b) => b.id === bundleId) ?? initial;
  const setQuantity = useCallback((n: number) => setQty(Math.min(Math.max(1, Math.round(n) || 1), MAX_LINE_QUANTITY)), []);
  const addToCart = useCallback(() => addLine(bundle.id, quantity), [addLine, bundle.id, quantity]);

  const value = useMemo(
    () => ({ product, bundle, select: setBundleId, quantity, setQuantity, addToCart, registerMainButton, mainButton }),
    [product, bundle, quantity, setQuantity, addToCart, mainButton],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSelectedBundle(): SelectionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSelectedBundle must be used inside ProductSelectionProvider');
  return ctx;
}
