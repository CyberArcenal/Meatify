// src/renderer/pages/Dashboard/components/ActivityTimeline.tsx
import React from "react";
import { ShoppingCart, Package, Clock, Beef, Bell } from "lucide-react";
import type { ActivityEntry } from "../../../../api/analytics/dashboard";

interface Props {
  activities: ActivityEntry[];
  isLoading: boolean;
}

const ActivityTimeline: React.FC<Props> = ({ activities, isLoading }) => {
  const typeColors = {
    sale: "text-[var(--status-completed)] bg-[var(--status-completed-bg)]",
    inventory: "text-[var(--accent-gold)] bg-[var(--accent-gold-light)]",
    audit: "text-[var(--accent-purple)] bg-[var(--accent-purple-light)]",
  };

  const typeIcons = {
    sale: ShoppingCart,
    inventory: Package,
    audit: Clock,
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm hover:border-[var(--accent-gold)] transition-colors h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-[var(--accent-gold)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Recent Activities
        </h3>
        {!isLoading && activities.length > 0 && (
          <span className="ml-auto text-sm text-[var(--text-tertiary)]">
            {activities.length} entries
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto max-h-80 pr-1 custom-scrollbar">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 bg-[var(--card-secondary-bg)] rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-[var(--card-secondary-bg)] rounded w-3/4 mb-2" />
                  <div className="h-3 bg-[var(--card-secondary-bg)] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)] opacity-50" />
            <div className="text-[var(--text-tertiary)]">No recent activities</div>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((act) => {
              const Icon = typeIcons[act.type] || Clock;
              const colors = typeColors[act.type] || typeColors.audit;
              return (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--table-row-hover)] transition-colors"
                >
                  <div className={`p-1.5 rounded-full ${colors} flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] leading-tight">
                      {act.description}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {act.formattedTime}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityTimeline;