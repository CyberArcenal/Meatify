// src/components/Layout/TopBar/index.tsx
import React, { useState, useEffect, useMemo } from "react";
import TopBarLeft from "./TopBarLeft";
import TopBarCenter from "./TopBarCenter";
import TopBarRight from "./TopBarRight";
import notificationAPI from "../../api/core/notification";
import { DollarSign, ShoppingCart, User, Beef } from "lucide-react";
import { NotificationDrawer } from "../../components/Shared/NotificationDrawer";
import type { TopBarProps } from "./types";

// Route definitions
const ROUTES = [
  // Dashboard
  { path: "/", name: "Dashboard", category: "Main" },
  { path: "/dashboard", name: "Dashboard", category: "Main" },
  // POS
  { path: "/pos/cashier", name: "Cashier", category: "POS" },
  { path: "/pos/transactions", name: "Transactions", category: "POS" },
  { path: "/pos/products", name: "Products", category: "POS" },
  // Customers
  { path: "/customers/list", name: "Customer Directory", category: "Customers" },
  { path: "/customers/loyalty", name: "Loyalty Program", category: "Customers" },
  // Sales
  { path: "/sales/daily", name: "Daily Sales", category: "Sales" },
  { path: "/sales/reports", name: "Sales Reports", category: "Sales" },
  { path: "/sales/returns", name: "Returns & Refunds", category: "Sales" },
  // Inventory
  { path: "/inventory/stock", name: "Stock Levels", category: "Inventory" },
  { path: "/inventory/movements", name: "Movements", category: "Inventory" },
  { path: "/inventory/purchases", name: "Purchases", category: "Inventory" },
  { path: "/inventory/suppliers", name: "Suppliers", category: "Inventory" },
  { path: "/inventory/categories", name: "Categories", category: "Inventory" },
  // Reports
  { path: "/reports/financial", name: "Financial Reports", category: "Reports" },
  { path: "/reports/inventory", name: "Inventory Reports", category: "Reports" },
  { path: "/reports/customer", name: "Customer Insights", category: "Reports" },
  // System
  { path: "/system/audit", name: "Audit Trail", category: "System" },
  { path: "/system/settings", name: "System Settings", category: "System" },
  { path: "/devices", name: "Device Manager", category: "System" },
];

const CURRENT_USER_ID = 1;

const TopBar: React.FC<TopBarProps> = ({ toggleSidebar }) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const count = await notificationAPI.getUnreadCount(CURRENT_USER_ID);
        setUnreadCount(count);
      } catch (error) {
        console.error("Failed to fetch unread count", error);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Route icon mapping
  const getRouteIcon = (category: string) => {
    const icons: Record<string, React.ElementType> = {
      Main: DollarSign,
      POS: ShoppingCart,
      Customers: User,
      Sales: DollarSign,
      Inventory: Beef,
      Reports: DollarSign,
      System: User,
    };
    return icons[category] || DollarSign;
  };

  return (
    <>
      <header className="sticky top-0 z-40 p-1 bg-gradient-to-r from-[var(--sidebar-bg)] to-[#1e293b] border-b border-[var(--sidebar-border)] flex items-center justify-between shadow-lg">
        <TopBarLeft toggleSidebar={toggleSidebar} />
        <TopBarCenter routes={ROUTES} getRouteIcon={getRouteIcon} />
        <TopBarRight
          unreadCount={unreadCount}
          onNotificationClick={() => setNotificationsOpen(true)}
        />
      </header>

      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </>
  );
};

export default TopBar;