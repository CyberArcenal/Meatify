// src/renderer/pages/customer/components/SummaryCards.tsx
import React from "react";
import { Users, Star, Award, UserPlus, Crown } from "lucide-react";
import type { CustomerStatistics } from "../../../api/core/customer";
import type { CustomerMetrics } from "../hooks/useCustomers";

interface SummaryCardsProps {
  stats: CustomerStatistics | null;
  metrics: CustomerMetrics;
  loading: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ stats, metrics, loading }) => {
  if (loading || !stats) {
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
      title: "Total Customers",
      value: metrics.total,
      icon: Users,
      color: "var(--accent-blue)",
      bg: "var(--accent-blue-light)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "VIP",
      value: metrics.vipCount || stats.byStatus?.vip || 0,
      icon: Crown,
      color: "var(--customer-vip)",
      bg: "rgba(212, 175, 55, 0.15)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Elite",
      value: metrics.eliteCount || stats.byStatus?.elite || 0,
      icon: Award,
      color: "var(--customer-loyal)",
      bg: "rgba(243, 156, 18, 0.15)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Regular",
      value: metrics.regularCount || stats.byStatus?.regular || 0,
      icon: Users,
      color: "var(--customer-regular)",
      bg: "rgba(52, 152, 219, 0.15)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "New This Month",
      value: metrics.newThisMonth,
      icon: UserPlus,
      color: "var(--success-color)",
      bg: "var(--status-completed-bg)",
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