// src/renderer/pages/analytics/returns/components/StatsCards.tsx
import React from "react";
import { BarChart2, Users, PieChart } from "lucide-react";
import Decimal from "decimal.js";
import type { ReturnStats } from "../hooks/useReturnRefunds";

interface StatsCardsProps {
  stats: ReturnStats | null;
  loading?: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* By Status */}
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] hover:border-[var(--accent-gold)] transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-5 h-5 text-[var(--accent-amber)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">By Status</h3>
        </div>
        {stats.statusCounts.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No data</p>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {stats.statusCounts.map((item) => (
              <li key={item.status} className="flex justify-between text-sm border-b border-[var(--border-light)] pb-1 last:border-0">
                <span className="text-[var(--text-secondary)] capitalize">{item.status}</span>
                <span className="text-[var(--text-primary)] font-medium">
                  {item.count} {item.total > 0 && `(₱${new Decimal(item.total).toFixed(2)})`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Top Customers */}
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] hover:border-[var(--accent-gold)] transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[var(--accent-purple)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top Returning Customers</h3>
        </div>
        {stats.topCustomers.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No data</p>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {stats.topCustomers.map((item) => (
              <li key={item.customerId} className="flex justify-between text-sm border-b border-[var(--border-light)] pb-1 last:border-0">
                <span className="text-[var(--text-primary)] truncate max-w-[150px]">{item.customerName}</span>
                <span className="text-[var(--accent-gold)] font-medium">
                  {item.count} {item.totalAmount > 0 && `(₱${new Decimal(item.totalAmount).toFixed(2)})`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick Stats */}
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] hover:border-[var(--accent-gold)] transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-[var(--accent-blue)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Quick Stats</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Total Processed</span>
            <span className="text-[var(--accent-green)] font-medium">
              ₱{new Decimal(stats.totalProcessedAmount || 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Average Refund</span>
            <span className="text-[var(--accent-blue)] font-medium">
              ₱{new Decimal(stats.averageProcessedAmount || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};