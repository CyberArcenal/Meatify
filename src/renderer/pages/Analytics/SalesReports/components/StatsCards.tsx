// src/renderer/pages/Analytics/SalesReports/components/StatsCards.tsx
import React from 'react';
import { Package, Users, Clock } from 'lucide-react';
import type { SalesReportItem, CustomerReportItem, DailyTrend } from '../../../../api/analytics/salesReport';

interface Props {
  topProducts: SalesReportItem[];
  topCustomers: CustomerReportItem[];
  hourlyData: DailyTrend[]; // ← ginamit ang imported na DailyTrend type
  loading: boolean;
}

const StatsCards: React.FC<Props> = ({ topProducts, topCustomers, hourlyData, loading }) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Top Products */}
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] hover:border-[var(--accent-gold)] transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-[var(--accent-blue)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top Products</h3>
        </div>
        {topProducts.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No data</p>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {topProducts.map(item => (
              <li key={item.meatId} className="flex justify-between text-sm border-b border-[var(--border-light)] pb-1 last:border-0">
                <span className="text-[var(--text-primary)] truncate max-w-[150px]">{item.meatName}</span>
                <span className="text-[var(--accent-blue)] font-medium">
                  {item.totalWeight.toFixed(2)} kg
                  <span className="text-[var(--text-tertiary)] ml-1">({formatCurrency(item.totalRevenue)})</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Top Customers */}
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] hover:border-[var(--accent-gold)] transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[var(--success-color)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top Customers</h3>
        </div>
        {topCustomers.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No data</p>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {topCustomers.map(item => (
              <li key={item.customerId} className="flex justify-between text-sm border-b border-[var(--border-light)] pb-1 last:border-0">
                <span className="text-[var(--text-primary)] truncate max-w-[150px]">{item.customerName}</span>
                <span className="text-[var(--success-color)] font-medium">
                  {item.purchaseCount} orders
                  <span className="text-[var(--text-tertiary)] ml-1">({formatCurrency(item.totalSpent)})</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Daily Trend */}
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] hover:border-[var(--accent-gold)] transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-[var(--accent-amber)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Daily Trend</h3>
        </div>
        {hourlyData.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No data</p>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {hourlyData.slice(-5).map(item => (
              <li key={item.date} className="flex justify-between text-sm border-b border-[var(--border-light)] pb-1 last:border-0">
                <span className="text-[var(--text-primary)]">{new Date(item.date).toLocaleDateString()}</span>
                <span className="text-[var(--accent-amber)] font-medium">
                  {item.count} sales
                  <span className="text-[var(--text-tertiary)] ml-1">({formatCurrency(item.revenue)})</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default StatsCards;