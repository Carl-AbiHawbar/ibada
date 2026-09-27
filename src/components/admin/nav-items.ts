import {
  Bell,
  Boxes,
  CircleUser,
  History,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Star,
  TicketPercent,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { can, type Area, type StaffRole } from '@/lib/permissions';

export type NavItem = { href: string; label: string; icon: LucideIcon; area: Area; mobile: 'tab' | 'more' };

const ITEMS: NavItem[] = [
  { href: '/admin', label: 'Home', icon: LayoutDashboard, area: 'home', mobile: 'tab' },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag, area: 'orders', mobile: 'tab' },
  { href: '/admin/products', label: 'Products', icon: Package, area: 'products', mobile: 'tab' },
  { href: '/admin/customers', label: 'Customers', icon: Users, area: 'customers', mobile: 'tab' },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes, area: 'inventory', mobile: 'more' },
  { href: '/admin/discounts', label: 'Discounts', icon: TicketPercent, area: 'discounts', mobile: 'more' },
  { href: '/admin/reviews', label: 'Reviews', icon: Star, area: 'reviews', mobile: 'more' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, area: 'settings', mobile: 'more' },
  { href: '/admin/staff', label: 'Staff', icon: UserCog, area: 'staff', mobile: 'more' },
  { href: '/admin/activity', label: 'Activity', icon: History, area: 'activity', mobile: 'more' },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell, area: 'notifications', mobile: 'more' },
  { href: '/admin/account', label: 'Account', icon: CircleUser, area: 'account', mobile: 'more' },
];

export function navItemsFor(role: StaffRole): NavItem[] {
  return ITEMS.filter((i) => can(role, i.area));
}

export function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);
}
