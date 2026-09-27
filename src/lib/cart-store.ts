import { z } from 'zod';
import { MAX_CART_LINES, MAX_LINE_QUANTITY, type CartLine } from './cart-schema';

// Saved carts may hold quantities above the cap (clamped below), but never junk.
const savedLine = z.object({ bundleId: z.uuid(), quantity: z.int().min(1) });

export const CART_STORAGE_KEY = 'ibada_cart_v1';

type Storage = { getItem(key: string): string | null; setItem(key: string, value: string): void };

const clampQty = (n: number) => Math.min(Math.max(Math.round(n), 1), MAX_LINE_QUANTITY);

/** Read a saved cart defensively: only well-formed lines survive, merged and clamped. */
export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const merged = new Map<string, number>();
  for (const item of data) {
    const r = savedLine.safeParse(item);
    if (r.success) merged.set(r.data.bundleId, (merged.get(r.data.bundleId) ?? 0) + r.data.quantity);
  }
  return [...merged]
    .slice(0, MAX_CART_LINES)
    .map(([bundleId, quantity]) => ({ bundleId, quantity: clampQty(quantity) }));
}

export type CartStore = {
  getLines(): CartLine[];
  subscribe(listener: () => void): () => void;
  add(bundleId: string, quantity: number): void;
  setQuantity(bundleId: string, quantity: number): void;
  remove(bundleId: string): void;
  replace(lines: CartLine[]): void;
  clear(): void;
};

/** A tiny external store for useSyncExternalStore, persisted to localStorage. */
export function createCartStore(storage: Storage): CartStore {
  let lines: CartLine[];
  try {
    lines = parseCart(storage.getItem(CART_STORAGE_KEY));
  } catch {
    lines = [];
  }
  const listeners = new Set<() => void>();

  const commit = (next: CartLine[]) => {
    lines = next.slice(0, MAX_CART_LINES);
    try {
      storage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Private browsing / full storage: keep the in-memory cart.
    }
    for (const l of listeners) l();
  };

  return {
    getLines: () => lines,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    add(bundleId, quantity) {
      const existing = lines.find((l) => l.bundleId === bundleId);
      commit(
        existing
          ? lines.map((l) => (l.bundleId === bundleId ? { bundleId, quantity: clampQty(l.quantity + quantity) } : l))
          : [...lines, { bundleId, quantity: clampQty(quantity) }],
      );
    },
    setQuantity(bundleId, quantity) {
      commit(
        quantity < 1
          ? lines.filter((l) => l.bundleId !== bundleId)
          : lines.map((l) => (l.bundleId === bundleId ? { bundleId, quantity: clampQty(quantity) } : l)),
      );
    },
    remove(bundleId) {
      commit(lines.filter((l) => l.bundleId !== bundleId));
    },
    replace(next) {
      commit(next.map((l) => ({ bundleId: l.bundleId, quantity: clampQty(l.quantity) })));
    },
    clear() {
      commit([]);
    },
  };
}
