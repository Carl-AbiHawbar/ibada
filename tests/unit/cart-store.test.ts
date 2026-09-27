import { expect, test, vi } from 'vitest';
import { CART_STORAGE_KEY, createCartStore, parseCart } from '@/lib/cart-store';

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';

const memoryStorage = () => {
  const mem = new Map<string, string>();
  return { mem, storage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) } };
};

test('parseCart drops garbage, merges duplicates and clamps quantities', () => {
  expect(parseCart(null)).toEqual([]);
  expect(parseCart('nope')).toEqual([]);
  expect(parseCart('{"a":1}')).toEqual([]);
  expect(
    parseCart(
      JSON.stringify([
        { bundleId: U1, quantity: 2 },
        { bundleId: U1, quantity: 20 },
        { bundleId: 'x', quantity: 1 },
        { bundleId: U2, quantity: -3 },
        { bundleId: U2, quantity: 'many' },
      ]),
    ),
  ).toEqual([{ bundleId: U1, quantity: 10 }]);
});

test('parseCart keeps at most 10 lines', () => {
  const lines = Array.from({ length: 12 }, (_, i) => ({ bundleId: `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`, quantity: 1 }));
  expect(parseCart(JSON.stringify(lines))).toHaveLength(10);
});

test('store adds, merges and persists', () => {
  const { mem, storage } = memoryStorage();
  const s = createCartStore(storage);
  const listener = vi.fn();
  s.subscribe(listener);
  s.add(U1, 1);
  s.add(U1, 2);
  s.add(U2, 1);
  expect(s.getLines()).toEqual([
    { bundleId: U1, quantity: 3 },
    { bundleId: U2, quantity: 1 },
  ]);
  expect(JSON.parse(mem.get(CART_STORAGE_KEY)!)).toEqual(s.getLines());
  expect(listener).toHaveBeenCalledTimes(3);
});

test('quantity 0 removes; quantities cap at 10', () => {
  const { storage } = memoryStorage();
  const s = createCartStore(storage);
  s.add(U1, 8);
  s.add(U1, 8);
  expect(s.getLines()).toEqual([{ bundleId: U1, quantity: 10 }]);
  s.setQuantity(U1, 0);
  expect(s.getLines()).toEqual([]);
});

test('store starts from what is saved, and replace/clear work', () => {
  const { mem, storage } = memoryStorage();
  mem.set(CART_STORAGE_KEY, JSON.stringify([{ bundleId: U2, quantity: 4 }]));
  const s = createCartStore(storage);
  expect(s.getLines()).toEqual([{ bundleId: U2, quantity: 4 }]);
  s.replace([{ bundleId: U1, quantity: 1 }]);
  expect(s.getLines()).toEqual([{ bundleId: U1, quantity: 1 }]);
  s.remove(U1);
  expect(s.getLines()).toEqual([]);
  s.add(U2, 1);
  s.clear();
  expect(mem.get(CART_STORAGE_KEY)).toBe('[]');
});

test('getLines returns a stable snapshot between changes', () => {
  const { storage } = memoryStorage();
  const s = createCartStore(storage);
  s.add(U1, 1);
  expect(s.getLines()).toBe(s.getLines());
});

test('storage failures (private mode) do not break the cart', () => {
  const s = createCartStore({
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('quota');
    },
  });
  s.add(U1, 1);
  expect(s.getLines()).toEqual([{ bundleId: U1, quantity: 1 }]);
});
