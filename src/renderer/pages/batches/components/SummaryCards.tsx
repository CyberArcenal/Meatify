// src/renderer/pages/inventory/batches/components/SummaryCards.tsx
import React from "react";
import { Package, Layers, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import type { BatchStatistics } from "../../../api/core/batch";

interface SummaryCardsProps {
  statistics: BatchStatistics | null;
  loading: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ statistics, loading }) => {
  if (loading || !statistics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
            <div className="h-3 bg-[var(--border-color)] rounded w-24 mb-2" />
            <div className="h-6 bg-[var(--border-color)] rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const total = Object.values(statistics.byStatus).reduce((a, b) => a + b, 0);

  const cards = [
    {
      title: "Total Batches",
      value: total,
      icon: Package,
      color: "var(--accent-blue)",
      bg: "var(--accent-blue-light)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Active",
      value: statistics.byStatus.active || 0,
      icon: CheckCircle,
      color: "var(--success-color)",
      bg: "var(--status-completed-bg)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Depleted",
      value: statistics.byStatus.depleted || 0,
      icon: Layers,
      color: "var(--text-secondary)",
      bg: "var(--stock-outstock-bg)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Expired",
      value: statistics.byStatus.expired || 0,
      icon: XCircle,
      color: "var(--danger-color)",
      bg: "var(--status-cancelled-bg)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Expiring Soon",
      value: statistics.expiringSoon || 0,
      icon: AlertTriangle,
      color: "var(--warning-color)",
      bg: "var(--status-pending-bg)",
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