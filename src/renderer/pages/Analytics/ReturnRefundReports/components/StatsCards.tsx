// src/renderer/pages/analytics/returns/components/StatsCards.tsx
import React from "react";
import { BarChart2, Users, Calendar, PieChart } from "lucide-react";
import Decimal from "decimal.js";
import type { ReturnStatistics } from "../../../../api/core/returnRefund";

interface StatsCardsProps {
  stats: ReturnStatistics | null;
  loading?: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-[var(--card-secondary-bg)] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* By Status */}
      <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-5 h-5 text-[var(--accent-amber)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">By Status</h3>
        </div>
        {stats.statusCounts?.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No data</p>
        ) : (
          <div className="space-y-2">
            {stats.statusCounts?.map((item) => (
              <div key={item.status} className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)] capitalize">{item.status}</span>
                <span className="text-[var(--text-primary)] font-medium">
                  {item.count} ({item.total ? `₱${new Decimal(item.total).toFixed(2)}` : "0"})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Customers */}
      <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-[var(--accent-purple)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top Returning Customers</h3>
        </div>
        {stats.topCustomers?.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No data</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {stats.topCustomers?.map((item) => (
              <div key={item.customerId} className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)] truncate max-w-[120px]">
                  {item.customerName}
                </span>
                <span className="text-[var(--accent-gold)] font-medium">
                  {item.returnCount} ({item.totalRefunded ? `₱${new Decimal(item.totalRefunded).toFixed(2)}` : "0"})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="w-5 h-5 text-[var(--accent-blue)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Quick Stats</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Total Processed Amount</span>
            <span className="text-[var(--accent-green)] font-medium">
              ₱{new Decimal(stats.totalProcessedAmount || 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Average Processed</span>
            <span className="text-[var(--accent-blue)] font-medium">
              ₱{new Decimal(stats.averageProcessedAmount || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};