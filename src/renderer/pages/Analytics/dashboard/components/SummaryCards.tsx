// src/renderer/pages/Dashboard/components/SummaryCards.tsx
import React from "react";
import {
  ShoppingCart,
  DollarSign,
  Users,
  AlertTriangle,
  Beef,
} from "lucide-react";
import SummaryCard from "./SummaryCard";
import type { DashboardSummary } from "../../../../api/analytics/dashboard";

interface Props {
  summary: DashboardSummary | null;
  isLoading: boolean;
}

const SummaryCards: React.FC<Props> = ({ summary, isLoading }) => {
  const formatNumber = (val: number) => val?.toLocaleString() || "0";
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(val || 0);

  const cards = [
    {
      title: "Sales Today",
      value: summary ? formatNumber(summary.salesToday) : "—",
      icon: ShoppingCart,
      color: "blue" as const,
    },
    {
      title: "Revenue Today",
      value: summary ? formatCurrency(summary.revenueToday) : "—",
      icon: DollarSign,
      color: "gold" as const,
    },
    {
      title: "Total Customers",
      value: summary ? formatNumber(summary.totalCustomers) : "—",
      icon: Users,
      color: "purple" as const,
    },
    {
      title: "Low Stock Alerts",
      value: summary ? formatNumber(summary.lowStockCount) : "—",
      icon: AlertTriangle,
      color: "red" as const,
    },
    {
      title: "Total Products",
      value: summary ? formatNumber(summary.totalProducts) : "—",
      icon: Beef,
      color: "amber" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <SummaryCard
          key={card.title}
          title={card.title}
          value={card.value}
          icon={card.icon}
          color={card.color}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
};

export default SummaryCards;