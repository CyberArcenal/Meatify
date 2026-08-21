// src/renderer/layouts/Sidebar/types.ts
import type { LucideIcon } from 'lucide-react';

export interface MenuItem {
  path: string;
  name: string;
  icon: LucideIcon;
  category?: 'core' | 'analytics' | 'system';
  children?: MenuItem[];
  hidden?: boolean;
}

export interface SidebarStats {
  revenueToday: number;
  transactions: number;
  lowStockCount: number;
  pendingOrders: number;
}

export interface SidebarState {
  openDropdowns: Record<string, boolean>;
  isOpen: boolean;
}

export interface SidebarContextValue {
  isOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openDropdowns: Record<string, boolean>;
  toggleDropdown: (name: string) => void;
  isActivePath: (path: string) => boolean;
  isDropdownActive: (items: MenuItem[]) => boolean;
}