// src/renderer/pages/inventory/stock/components/SummaryCards.tsx
import React from "react";
import { Beef, DollarSign, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import Decimal from "decimal.js";
import type { StockSummary } from "../hooks/useStockLevels";

interface SummaryCardsProps {
  summary: StockSummary;
  loading: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
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
      title: "Total Meats",
      value: summary.totalMeats,
      icon: Beef,
      color: "var(--accent-gold)",
      bg: "var(--accent-gold-light)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Stock Value",
      value: summary.totalStockValue,
      icon: DollarSign,
      color: "var(--success-color)",
      bg: "var(--status-completed-bg)",
      format: (v: number) => `₱${v.toFixed(2)}`,
    },
    {
      title: "In Stock",
      value: summary.inStockCount,
      icon: CheckCircle,
      color: "var(--success-color)",
      bg: "var(--status-completed-bg)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Low Stock",
      value: summary.lowStockCount,
      icon: AlertTriangle,
      color: "var(--warning-color)",
      bg: "var(--status-pending-bg)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Out of Stock",
      value: summary.outOfStockCount,
      icon: XCircle,
      color: "var(--danger-color)",
      bg: "var(--status-cancelled-bg)",
      format: (v: number) => v.toLocaleString(),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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