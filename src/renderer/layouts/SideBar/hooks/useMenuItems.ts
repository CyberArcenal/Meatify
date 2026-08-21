// src/renderer/layouts/Sidebar/hooks/useMenuItems.ts
import { useMemo } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  TrendingUp,
  Bell,
  HelpCircle,
  ListChecks,
  CalendarDays,
  Users2,
  Receipt,
  BarChart2,
  Trophy,
  Layers,
  Shuffle,
  FileBarChart,
  DollarSign,
  ClipboardList,
  UserCheck,
  Sliders,
  Boxes,
  Tags,
  RotateCcw,
  ClipboardCheck,
  Building2,
  ComputerIcon,
  Calculator,
} from 'lucide-react';
import type { MenuItem } from '../types';

// Menu items for Meatify (Offline POS - No role-based filtering)
const MENU_ITEMS: MenuItem[] = [
  { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard, category: 'core' },

  {
    path: '/pos',
    name: 'Point of Sale',
    icon: ShoppingCart,
    category: 'core',
    children: [
      { path: '/pos/cashier', name: 'Cashier', icon: Calculator },
      { path: '/pos/transactions', name: 'Transactions', icon: Receipt },
      { path: '/pos/products', name: 'Products', icon: Package },
    ],
  },

  {
    path: '/customers',
    name: 'Customers',
    icon: Users,
    category: 'core',
    children: [
      { path: '/customers/list', name: 'Customer Directory', icon: Users2 },
      { path: '/customers/loyalty', name: 'Loyalty Program', icon: Trophy },
    ],
  },

  {
    path: '/sales',
    name: 'Sales',
    icon: TrendingUp,
    category: 'core',
    children: [
      { path: '/sales/daily', name: 'Daily Sales', icon: CalendarDays },
      { path: '/sales/reports', name: 'Sales Reports', icon: BarChart2 },
      { path: '/sales/returns', name: 'Returns & Refunds', icon: RotateCcw },
    ],
  },

  {
    path: '/inventory',
    name: 'Inventory',
    icon: Boxes,
    category: 'core',
    children: [
      { path: '/inventory/stock', name: 'Stock Levels', icon: Layers },
      { path: '/inventory/movements', name: 'Movements', icon: Shuffle },
      { path: '/inventory/purchases', name: 'Purchases', icon: ClipboardCheck },
      { path: '/inventory/suppliers', name: 'Suppliers', icon: Building2 },
      { path: '/inventory/categories', name: 'Categories', icon: Tags },
    ],
  },

  {
    path: '/reports',
    name: 'Reports',
    icon: FileBarChart,
    category: 'analytics',
    children: [
      { path: '/reports/financial', name: 'Financial Reports', icon: DollarSign },
      { path: '/reports/inventory', name: 'Inventory Reports', icon: ClipboardList },
      { path: '/reports/customer', name: 'Customer Insights', icon: UserCheck },
    ],
  },

  {
    path: '/system',
    name: 'System',
    icon: Settings,
    category: 'system',
    children: [
      { path: '/system/audit', name: 'Audit Trail', icon: ListChecks },
      { path: '/notification-logs', name: 'Notification Logs', icon: Bell },
      { path: '/devices', name: 'Device Manager', icon: ComputerIcon },
      { path: '/system/settings', name: 'System Settings', icon: Sliders },
    ],
  },
];

export const useMenuItems = () => {
  // No role filtering since this is an offline app
  const filteredMenuItems = useMemo(() => {
    // Filter out hidden items if any
    return MENU_ITEMS.filter((item) => !item.hidden);
  }, []);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {
      core: [],
      analytics: [],
      system: [],
    };

    filteredMenuItems.forEach((item) => {
      if (item.category && groups[item.category]) {
        groups[item.category].push(item);
      } else {
        groups.core.push(item);
      }
    });

    return groups;
  }, [filteredMenuItems]);

  return {
    menuItems: filteredMenuItems,
    groupedItems,
    categories: [
      { id: 'core', name: 'Core Modules' },
      { id: 'analytics', name: 'Analytics & Reports' },
      { id: 'system', name: 'System' },
    ].filter(
      (cat) => groupedItems[cat.id as keyof typeof groupedItems]?.length > 0
    ),
  };
};