import {
  Bell,
  Boxes,
  CircleUser,
  Gift,
  History,
  House,
  Inbox,
  Settings,
  Star,
  Tag,
  TicketPercent,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { can, type Area, type StaffRole } from '@/lib/permissions';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  area: Area;
  mobile: 'tab' | 'more';
  /** Shown indented under this item in the sidebar, as Shopify nests Inventory under Products. */
  parent?: string;
  /** Sidebar group: the main list, the team block, or pinned to the bottom. */
  group: 'main' | 'team' | 'bottom' | 'menu';
};

const ITEMS: NavItem[] = [
  { href: '/admin', label: 'Home', icon: House, area: 'home', mobile: 'tab', group: 'main' },
  { href: '/admin/orders', label: 'Orders', icon: Inbox, area: 'orders', mobile: 'tab', group: 'main' },
  { href: '/admin/products', label: 'Products', icon: Tag, area: 'products', mobile: 'tab', group: 'main' },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes, area: 'inventory', mobile: 'more', group: 'main', parent: '/admin/products' },
  { href: '/admin/reviews', label: 'Reviews', icon: Star, area: 'reviews', mobile: 'more', group: 'main', parent: '/admin/products' },
  { href: '/admin/customers', label: 'Customers', icon: Users, area: 'customers', mobile: 'tab', group: 'main' },
  { href: '/admin/subscribers', label: 'Free delivery sign-ups', icon: Gift, area: 'subscribers', mobile: 'more', group: 'main' },
  { href: '/admin/discounts', label: 'Discounts', icon: TicketPercent, area: 'discounts', mobile: 'more', group: 'main' },
  { href: '/admin/staff', label: 'Staff', icon: UserCog, area: 'staff', mobile: 'more', group: 'team' },
  { href: '/admin/activity', label: 'Activity', icon: History, area: 'activity', mobile: 'more', group: 'team' },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell, area: 'notifications', mobile: 'more', group: 'bottom' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, area: 'settings', mobile: 'more', group: 'bottom' },
  { href: '/admin/account', label: 'Account', icon: CircleUser, area: 'account', mobile: 'more', group: 'menu' },
];

export function navItemsFor(role: StaffRole): NavItem[] {
  return ITEMS.filter((i) => can(role, i.area));
}

export function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);
}
