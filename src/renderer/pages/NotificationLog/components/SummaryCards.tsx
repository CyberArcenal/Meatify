// src/renderer/pages/system/notification-logs/components/SummaryCards.tsx
import React from "react";
import { Mail, Clock, AlertCircle, CheckCircle } from "lucide-react";
import type { LogStatistics } from "../../../api/core/notificationLog";

interface SummaryCardsProps {
  stats: LogStatistics | null;
  loading: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
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
      title: "Total Notifications",
      value: stats.total || 0,
      icon: Mail,
      color: "var(--accent-gold)",
      bg: "var(--accent-gold-light)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Last 24 Hours",
      value: stats.last24h || 0,
      icon: Clock,
      color: "var(--accent-blue)",
      bg: "var(--accent-blue-light)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Avg Retries (Failed)",
      value: stats.avgRetryFailed || 0,
      icon: AlertCircle,
      color: "var(--accent-amber)",
      bg: "var(--accent-amber-light)",
      format: (v: number) => v.toFixed(2),
    },
    {
      title: "Sent",
      value: stats.byStatus?.sent || 0,
      icon: CheckCircle,
      color: "var(--success-color)",
      bg: "var(--status-completed-bg)",
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