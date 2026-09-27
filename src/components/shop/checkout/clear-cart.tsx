'use client';

import { useEffect } from 'react';
import { useCart } from '@/components/shop/cart/cart-provider';

/** Empties the cart once the confirmation page has rendered. */
export function ClearCart() {
  const { clear } = useCart();
  useEffect(() => clear(), [clear]);
  return null;
}
