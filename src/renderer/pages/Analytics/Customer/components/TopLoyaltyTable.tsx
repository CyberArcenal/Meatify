// src/renderer/pages/Analytics/Customer/components/TopLoyaltyTable.tsx
import React from 'react';
import { Award, Star } from 'lucide-react';

interface TopLoyalty {
  customerId: number;
  customerName: string;
  points: number;
}

interface Props {
  data: TopLoyalty[];
  isLoading?: boolean;
}

const TopLoyaltyTable: React.FC<Props> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 animate-pulse">
        <div className="h-6 w-40 bg-[var(--card-secondary-bg)] rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-[var(--card-secondary-bg)] rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-[var(--accent-gold)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Top Loyalty Members</h3>
        </div>
        <p className="text-[var(--text-tertiary)] text-center py-4">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm hover:border-[var(--accent-gold)] transition-colors">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-[var(--accent-gold)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Top Loyalty Members</h3>
        <span className="ml-auto text-sm text-[var(--text-tertiary)]">
          by points
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">#</th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Customer</th>
              <th className="text-right py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Points</th>
              <th className="text-right py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-light)]">
            {data.map((customer, idx) => (
              <tr key={customer.customerId} className="hover:bg-[var(--table-row-hover)] transition-colors">
                <td className="py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  {idx === 0 && <Star className="w-4 h-4 text-[var(--accent-gold)] inline fill-[var(--accent-gold)]" />}
                  {idx === 1 && <span className="text-[var(--accent-amber)]">#{idx + 1}</span>}
                  {idx > 1 && `#${idx + 1}`}
                </td>
                <td className="py-2 px-3 font-medium text-[var(--text-primary)]">{customer.customerName}</td>
                <td className="py-2 px-3 text-right font-semibold text-[var(--accent-gold)]">
                  {customer.points.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    customer.points > 1000
                      ? 'bg-[var(--accent-gold-light)] text-[var(--accent-gold)]'
                      : customer.points > 500
                      ? 'bg-[var(--accent-amber-light)] text-[var(--accent-amber)]'
                      : 'bg-[var(--border-light)] text-[var(--text-secondary)]'
                  }`}>
                    {customer.points > 1000 ? 'Elite' : customer.points > 500 ? 'VIP' : 'Regular'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopLoyaltyTable;