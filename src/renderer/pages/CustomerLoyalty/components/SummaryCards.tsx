// src/renderer/pages/Loyalty/components/SummaryCards.tsx
import React from "react";
import { Award, TrendingUp, Users, RefreshCw, Calendar } from "lucide-react";
import type { TransactionStatistics } from "../../../api/core/loyaltyTransaction";

interface SummaryCardsProps {
  statistics: TransactionStatistics | null;
  loading: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ statistics, loading }) => {
  if (loading || !statistics) {
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

  const totalTransactions = statistics.byType.reduce(
    (sum, item) => sum + item.count,
    0
  );

  const cards = [
    {
      title: "Total Points Earned",
      value: statistics.totalEarned,
      icon: Award,
      color: "var(--success-color)",
      bg: "var(--status-completed-bg)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Total Points Redeemed",
      value: statistics.totalRedeemed,
      icon: TrendingUp,
      color: "var(--danger-color)",
      bg: "var(--status-cancelled-bg)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Net Points",
      value: statistics.netPoints,
      icon: RefreshCw,
      color: "var(--accent-gold)",
      bg: "var(--accent-gold-light)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Total Transactions",
      value: totalTransactions,
      icon: Users,
      color: "var(--accent-blue)",
      bg: "var(--accent-blue-light)",
      format: (v: number) => v.toLocaleString(),
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