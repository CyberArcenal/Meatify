// src/renderer/pages/system/notification-logs/components/NotificationStats.tsx
import React from "react";
import { Mail, Clock, AlertCircle, CheckCircle } from "lucide-react";
import type { LogStatistics } from "../../../api/core/notificationLog"; // ✅ corrected import

interface NotificationStatsProps {
  stats: LogStatistics | null;  // ✅ corrected type
  loading?: boolean;
}

export const NotificationStats: React.FC<NotificationStatsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
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
      title: "Total Notifications",
      value: stats.total,
      icon: Mail,
      color: "var(--accent-gold)",
    },
    {
      title: "Last 24 Hours",
      value: stats.last24h,
      icon: Clock,
      color: "var(--accent-blue)",
    },
    {
      title: "Avg Retries (Failed)",
      value: stats.avgRetryFailed? stats.avgRetryFailed.toFixed(2): 0,
      icon: AlertCircle,
      color: "var(--accent-amber)",
    },
    {
      title: "Sent",
      value: stats.byStatus?.sent || 0,
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