// src/renderer/pages/inventory/reorder/components/ReorderSummaryCards.tsx
import React from "react";
import { AlertTriangle, Truck, Package, DollarSign } from "lucide-react";
import type { ReorderSummary } from "../hooks/useReorder";

interface ReorderSummaryCardsProps {
  summary: ReorderSummary;
  loading: boolean;
}

export const ReorderSummaryCards: React.FC<ReorderSummaryCardsProps> = ({
  summary,
  loading,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse"
          >
            <div className="h-3 bg-[var(--border-color)] rounded w-24 mb-2" />
            <div className="h-6 bg-[var(--border-color)] rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Low Stock Items",
      value: summary.totalLowStockItems,
      icon: AlertTriangle,
      color: "var(--warning-color)",
      bg: "var(--status-pending-bg)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Suppliers to Reorder",
      value: summary.suppliersWithLowStock,
      icon: Truck,
      color: "var(--accent-blue)",
      bg: "var(--accent-blue-light)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Total Reorder Quantity",
      value: summary.totalReorderQty,
      icon: Package,
      color: "var(--accent-gold)",
      bg: "var(--accent-gold-light)",
      format: (v: number) => `${v.toFixed(2)} kg`,
    },
    {
      title: "Estimated Reorder Value",
      value: summary.totalValue,
      icon: DollarSign,
      color: "var(--success-color)",
      bg: "var(--status-completed-bg)",
      format: (v: number) => `₱${v.toFixed(2)}`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  {card.title}
                </p>
                <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                  {card.format(card.value)}
                </p>
              </div>
              <div className={`p-2.5 rounded-full`} style={{ backgroundColor: card.bg }}>
                <Icon className={`w-4 h-4`} style={{ color: card.color }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};