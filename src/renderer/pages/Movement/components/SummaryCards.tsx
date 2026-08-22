// src/renderer/pages/inventory/movements/components/SummaryCards.tsx
import React from "react";
import { Package, TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from "lucide-react";

interface SummaryCardsProps {
  summary: {
    totalToday: number;
    byType: Record<string, number>;
    mostMovedMeat: { name: string; count: number } | null;
  };
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const cards = [
    {
      title: "Movements Today",
      value: summary.totalToday,
      icon: Package,
      color: "var(--accent-gold)",
      bg: "var(--accent-gold-light)",
    },
    {
      title: "Sales",
      value: summary.byType["sale"] || 0,
      icon: TrendingDown,
      color: "var(--accent-blue)",
      bg: "var(--accent-blue-light)",
    },
    {
      title: "Returns",
      value: summary.byType["refund"] || 0,
      icon: TrendingUp,
      color: "var(--accent-red)",
      bg: "var(--accent-red-light)",
    },
    {
      title: "Adjustments",
      value: summary.byType["adjustment"] || 0,
      icon: RefreshCw,
      color: "var(--accent-amber)",
      bg: "var(--accent-amber-light)",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="rounded-xl p-4 border border-[var(--border-color)] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            style={{ backgroundColor: card.bg }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium opacity-80 text-[var(--text-primary)]">
                  {card.title}
                </p>
                <p className="text-2xl font-bold mt-1 text-[var(--text-primary)]">
                  {card.value}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-black/10">
                <Icon className="w-6 h-6" style={{ color: card.color }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};