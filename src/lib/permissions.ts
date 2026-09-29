export type StaffRole = 'owner' | 'staff';
export type Area =
  | 'home'
  | 'orders'
  | 'products'
  | 'inventory'
  | 'customers'
  | 'reviews'
  | 'notifications'
  | 'account'
  | 'discounts'
  | 'settings'
  | 'staff'
  | 'activity'
  | 'subscribers';

const OWNER_ONLY: ReadonlySet<Area> = new Set(['discounts', 'settings', 'staff', 'activity', 'subscribers']);

export function can(role: StaffRole, area: Area): boolean {
  return role === 'owner' || !OWNER_ONLY.has(area);
}
