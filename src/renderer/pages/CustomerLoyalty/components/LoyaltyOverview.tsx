// src/renderer/pages/Loyalty/components/LoyaltyOverview.tsx
import React from "react";
import { Award, TrendingUp, Users, RefreshCw } from "lucide-react";
import type { TransactionStatistics } from "../../../api/core/loyaltyTransaction";

interface LoyaltyOverviewProps {
  statistics: TransactionStatistics;
}

export const LoyaltyOverview: React.FC<LoyaltyOverviewProps> = ({
  statistics,
}) => {
  const totalTransactions = statistics.byType.reduce(
    (sum, item) => sum + item.count,
    0
  );

  const cards = [
    {
      title: "Total Points Earned",
      value: statistics.totalEarned.toLocaleString(),
      icon: Award,
      color: "var(--accent-green)",
      bg: "var(--accent-green-light)",
    },
    {
      title: "Total Points Redeemed",
      value: statistics.totalRedeemed.toLocaleString(),
      icon: TrendingUp,
      color: "var(--accent-red)",
      bg: "var(--accent-red-light)",
    },
    {
      title: "Net Points",
      value: statistics.netPoints.toLocaleString(),
      icon: RefreshCw,
      color: "var(--accent-gold)",
      bg: "var(--accent-gold-light)",
    },
    {
      title: "Total Transactions",
      value: totalTransactions.toLocaleString(),
      icon: Users,
      color: "var(--accent-blue)",
      bg: "var(--accent-blue-light)",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="rounded-xl p-5 border border-[var(--border-color)] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
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