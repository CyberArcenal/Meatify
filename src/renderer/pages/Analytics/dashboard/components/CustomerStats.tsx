// src/renderer/pages/Dashboard/components/CustomerStats.tsx
import React from "react";
import { Users, UserPlus, Crown, Award } from "lucide-react";
import type { CustomerStats as CustomerStatsType } from "../../../../api/analytics/dashboard";

interface Props {
  stats: CustomerStatsType | null;
  isLoading: boolean;
}

const CustomerStats: React.FC<Props> = ({ stats, isLoading }) => {
  const formatNumber = (val: number) => val?.toLocaleString() || "0";
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(val || 0);

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm hover:border-[var(--accent-gold)] transition-colors h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-[var(--accent-gold)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Customer Stats
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto max-h-80 pr-1 custom-scrollbar">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-10 bg-[var(--card-secondary-bg)] animate-pulse rounded" />
            <div className="h-10 bg-[var(--card-secondary-bg)] animate-pulse rounded" />
            <div className="h-10 bg-[var(--card-secondary-bg)] animate-pulse rounded" />
          </div>
        ) : stats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--card-secondary-bg)] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatNumber(stats.totalCustomers)}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">Total</p>
              </div>
              <div className="bg-[var(--accent-gold-light)] rounded-lg p-3 text-center border border-[var(--accent-gold)]/20">
                <p className="text-2xl font-bold text-[var(--accent-gold)]">
                  +{formatNumber(stats.newCustomersToday)}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">New Today</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                Top Spenders
              </h4>
              {stats.topSpenders.slice(0, 3).map((spender, idx) => (
                <div
                  key={spender.customerId}
                  className="flex justify-between items-center py-2 text-sm border-b border-[var(--border-light)] last:border-0"
                >
                  <span className="text-[var(--text-primary)] flex items-center gap-1.5">
                    {idx === 0 && <Crown className="w-3.5 h-3.5 text-[var(--accent-gold)]" />}
                    {idx === 1 && <Award className="w-3.5 h-3.5 text-[var(--accent-amber)]" />}
                    {spender.name}
                  </span>
                  <span className="text-[var(--accent-gold)] font-medium">
                    {formatCurrency(spender.totalSpent)}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                Loyalty Distribution
              </h4>
              <div className="space-y-1">
                {stats.loyaltyDistribution.map((item) => (
                  <div
                    key={item.range}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-[var(--text-secondary)]">{item.range}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-[var(--card-secondary-bg)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent-gold)] rounded-full"
                          style={{
                            width: `${(item.count / stats.totalCustomers) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-[var(--text-primary)] font-medium text-xs min-w-[30px] text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border-color)] text-xs text-[var(--text-tertiary)] flex justify-between">
              <span>New this week: {formatNumber(stats.newCustomersThisWeek)}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--text-tertiary)]">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No customer data
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerStats;