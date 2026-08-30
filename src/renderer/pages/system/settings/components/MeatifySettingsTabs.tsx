// src/renderer/pages/system/settings/components/MeatifySettingsTabs.tsx
import React from "react";
import {
  Building2,
  Package,
  DollarSign,
  Printer,
  Bell,
  FileBarChart,
  Plug,
  Shield,
} from "lucide-react";

type TabKey = "general" | "inventory" | "sales" | "cashier" | "notifications" | "reports" | "integrations" | "audit_security";

interface TabItem {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  { key: "general", label: "General", icon: <Building2 className="w-4 h-4" /> },
  { key: "inventory", label: "Inventory", icon: <Package className="w-4 h-4" /> },
  { key: "sales", label: "Sales & Pricing", icon: <DollarSign className="w-4 h-4" /> },
  { key: "cashier", label: "Cashier / Hardware", icon: <Printer className="w-4 h-4" /> },
  { key: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  { key: "audit_security", label: "Audit & Security", icon: <Shield className="w-4 h-4" /> },
];

interface Props {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const MeatifySettingsTabs: React.FC<Props> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex flex-wrap gap-1 bg-[var(--card-secondary-bg)] p-1.5 rounded-xl border border-[var(--border-color)] shadow-sm">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
            ${
              activeTab === tab.key
                ? "bg-[var(--accent-gold)] text-[#1a1a1a] shadow-md shadow-[var(--accent-gold)]/20"
                : "text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)]"
            }
          `}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
};