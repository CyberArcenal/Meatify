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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Returns",
      value: summary.totalCount,
      icon: RotateCcw,
      color: "text-[var(--accent-amber)]",
      bg: "bg-[var(--accent-amber-light)]",
    },
    {
      title: "Total Amount",
      value: `₱${new Decimal(summary.totalAmount).toFixed(2)}`,
      icon: DollarSign,
      color: "text-[var(--accent-gold)]",
      bg: "bg-[var(--accent-gold-light)]",
    },
    {
      title: "Average Amount",
      value: `₱${new Decimal(summary.avgAmount).toFixed(2)}`,
      icon: Receipt,
      color: "text-[var(--accent-blue)]",
      bg: "bg-[var(--accent-blue-light)]",
    },
    {
      title: "Processed",
      value: summary.processedCount,
      icon: CheckCircle,
      color: "text-[var(--success-color)]",
      bg: "bg-[var(--status-completed-bg)]",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm hover:shadow-md hover:border-[var(--accent-gold)] transition-all duration-200 group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                  {card.value}
                </p>
              </div>
              <div className={`p-2.5 rounded-full ${card.bg} group-hover:ring-2 group-hover:ring-[var(--accent-gold)]/30 transition-all`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};