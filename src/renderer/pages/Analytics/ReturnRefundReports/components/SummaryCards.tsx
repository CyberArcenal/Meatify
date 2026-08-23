// src/renderer/pages/analytics/returns/components/SummaryCards.tsx
import React from "react";
import { RotateCcw, DollarSign, Receipt, CheckCircle } from "lucide-react";
import Decimal from "decimal.js";
import type { ReturnSummary } from "../hooks/useReturnRefunds";

interface SummaryCardsProps {
  summary: ReturnSummary | null;
  loading?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, loading }) => {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-[var(--card-secondary-bg)] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Returns",
      value: summary.totalCount,
      icon: RotateCcw,
      color: "var(--accent-amber)",
    },
    {
      title: "Total Amount",
      value: `₱${new Decimal(summary.totalAmount).toFixed(2)}`,
      icon: DollarSign,
      color: "var(--accent-gold)",
    },
    {
      title: "Average Amount",
      value: `₱${new Decimal(summary.avgAmount).toFixed(2)}`,
      icon: Receipt,
      color: "var(--accent-blue)",
    },
    {
      title: "Processed",
      value: summary.processedCount,
      icon: CheckCircle,
      color: "var(--accent-green)",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                {card.title}
              </p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {card.value}
              </p>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${card.color}20`, color: card.color }}
            >
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
};