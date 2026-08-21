// src/renderer/pages/Dashboard/components/SummaryCards.tsx
import React from "react";
import {
  ShoppingCart,
  DollarSign,
  Users,
  AlertTriangle,
  Package,
  Beef,
} from "lucide-react";
import type { DashboardSummary } from "../../../../api/analytics/dashboard";
import SummaryCard from "./SummaryCard";

interface Props {
  summary: DashboardSummary | null;
  isLoading: boolean;
}

const SummaryCards: React.FC<Props> = ({ summary, isLoading }) => {
  const formatNumber = (val: number) => val.toLocaleString();
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(val);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <SummaryCard
        title="Sales Today"
        value={summary ? formatNumber(summary.salesToday) : "—"}
        icon={ShoppingCart}
        color="blue"
        isLoading={isLoading}
      />
      <SummaryCard
        title="Revenue Today"
        value={summary ? formatCurrency(summary.revenueToday) : "—"}
        icon={DollarSign}
        color="gold"
        isLoading={isLoading}
      />
      <SummaryCard
        title="Total Customers"
        value={summary ? formatNumber(summary.totalCustomers) : "—"}
        icon={Users}
        color="purple"
        isLoading={isLoading}
      />
      <SummaryCard
        title="Low Stock Alerts"
        value={summary ? formatNumber(summary.lowStockCount) : "—"}
        icon={AlertTriangle}
        color="red"
        isLoading={isLoading}
      />
      <SummaryCard
        title="Total Products"
        value={summary ? formatNumber(summary.totalProducts) : "—"}
        icon={Beef}
        color="amber"
        isLoading={isLoading}
      />
    </div>
  );
};

export default SummaryCards;