// src/renderer/pages/Analytics/Customer/components/TopSpendersTable.tsx
import React from 'react';
import { TrendingUp, Crown } from 'lucide-react';

interface TopSpender {
  customerId: number;
  customerName: string;
  purchaseCount: number;
  totalSpent: number;
}

interface Props {
  data: TopSpender[];
  isLoading?: boolean;
}

const TopSpendersTable: React.FC<Props> = ({ data, isLoading }) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  if (isLoading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 animate-pulse">
        <div className="h-6 w-32 bg-[var(--card-secondary-bg)] rounded mb-4" />
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
          <TrendingUp className="w-5 h-5 text-[var(--accent-gold)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Top Spenders</h3>
        </div>
        <p className="text-[var(--text-tertiary)] text-center py-4">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm hover:border-[var(--accent-gold)] transition-colors">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-[var(--accent-gold)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Top Spenders</h3>
        <span className="ml-auto text-sm text-[var(--text-tertiary)]">
          by total spent
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">#</th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Customer</th>
              <th className="text-right py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Orders</th>
              <th className="text-right py-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Total Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-light)]">
            {data.map((customer, idx) => (
              <tr key={customer.customerId} className="hover:bg-[var(--table-row-hover)] transition-colors">
                <td className="py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  {idx === 0 && <Crown className="w-4 h-4 text-[var(--accent-gold)] inline" />}
                  {idx === 1 && <span className="text-[var(--accent-amber)]">#{idx + 1}</span>}
                  {idx > 1 && `#${idx + 1}`}
                </td>
                <td className="py-2 px-3 font-medium text-[var(--text-primary)]">{customer.customerName}</td>
                <td className="py-2 px-3 text-right text-[var(--text-primary)]">{customer.purchaseCount}</td>
                <td className="py-2 px-3 text-right font-semibold text-[var(--accent-gold)]">
                  {formatCurrency(customer.totalSpent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopSpendersTable;