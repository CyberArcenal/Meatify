// src/renderer/pages/AuditTrail/components/SummaryCards.tsx
import React from "react";
import { Users, Database, Calendar, BarChart } from "lucide-react";

interface SummaryCardsProps {
  summary: {
    totalToday: number;
    byAction: Record<string, number>;
    mostActiveUser: { user: string; count: number } | null;
    mostAffectedEntity: { entity: string; count: number } | null;
  };
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const topActions = Object.entries(summary.byAction)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const cards = [
    {
      title: "Actions Today",
      value: summary.totalToday,
      icon: Calendar,
      color: "var(--accent-gold)",
      bg: "var(--accent-gold-light)",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Most Active User",
      value: summary.mostActiveUser
        ? `${summary.mostActiveUser.user} (${summary.mostActiveUser.count})`
        : "N/A",
      icon: Users,
      color: "var(--accent-blue)",
      bg: "var(--accent-blue-light)",
      format: (v: string) => v,
    },
    {
      title: "Top Affected Entity",
      value: summary.mostAffectedEntity
        ? `${summary.mostAffectedEntity.entity} (${summary.mostAffectedEntity.count})`
        : "N/A",
      icon: Database,
      color: "var(--accent-purple)",
      bg: "var(--accent-purple-light)",
      format: (v: string) => v,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
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

      {/* Top Actions card */}
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          Top Actions
        </p>
        <div className="space-y-1">
          {topActions.length > 0 ? (
            topActions.map(([action, count]) => (
              <div key={action} className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)] truncate max-w-[100px]">
                  {action}
                </span>
                <span className="font-medium text-[var(--text-primary)]">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--text-tertiary)]">No data</p>
          )}
        </div>
      </div>
    </div>
  );
};