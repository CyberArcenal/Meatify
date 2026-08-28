import React from 'react';
import { Package, Users, Clock } from 'lucide-react';
import type { SalesReportItem, CustomerReportItem } from '../../../../api/analytics/salesReport';

interface Props {
  topProducts: SalesReportItem[];
  topCustomers: CustomerReportItem[];
  hourlyData: Array<{ date: string; revenue: number; count: number }>;
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
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)]">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-[var(--accent-blue)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Top Products</h3>
        </div>
        {topProducts.length === 0 ? (
          <p className="text-[var(--text-secondary)]">No data</p>
        ) : (
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {topProducts.map(item => (
              <li key={item.meatId} className="flex justify-between text-sm">
                <span className="text-[var(--text-primary)] truncate max-w-[150px]">{item.meatName}</span>
                <span className="text-[var(--accent-blue)] font-medium">
                  {item.totalWeight.toFixed(2)} kg ({formatCurrency(item.totalRevenue)})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Top Customers */}
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)]">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[var(--accent-green)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Top Customers</h3>
        </div>
        {topCustomers.length === 0 ? (
          <p className="text-[var(--text-secondary)]">No data</p>
        ) : (
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {topCustomers.map(item => (
              <li key={item.customerId} className="flex justify-between text-sm">
                <span className="text-[var(--text-primary)] truncate max-w-[150px]">{item.customerName}</span>
                <span className="text-[var(--accent-green)] font-medium">
                  {item.purchaseCount} ({formatCurrency(item.totalSpent)})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Daily Revenue Trend (simplified) */}
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)]">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-[var(--accent-amber)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent Daily Trend</h3>
        </div>
        {hourlyData.length === 0 ? (
          <p className="text-[var(--text-secondary)]">No data</p>
        ) : (
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {hourlyData.slice(-5).map(item => (
              <li key={item.date} className="flex justify-between text-sm">
                <span className="text-[var(--text-primary)]">{new Date(item.date).toLocaleDateString()}</span>
                <span className="text-[var(--accent-amber)] font-medium">
                  {item.count} ({formatCurrency(item.revenue)})
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