import React from 'react';
import { TrendingUp, Layers, Truck } from 'lucide-react';
import type { InventorySummaryData, CategorySummary, SupplierSummary, MeatInventorySummary } from '../../../../api/analytics/inventoryReports';

interface Props {
  stats: InventorySummaryData | null;
  loading: boolean;
  topValueItems: MeatInventorySummary[];
  categorySummary: CategorySummary[];
  supplierSummary: SupplierSummary[];
}

const StatsCards: React.FC<Props> = ({ stats, loading, topValueItems, categorySummary, supplierSummary }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse h-40" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Top Value Items */}
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)]">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-[var(--accent-green)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Top Value Items</h3>
        </div>
        {topValueItems.length === 0 ? (
          <p className="text-[var(--text-secondary)]">No data</p>
        ) : (
          <ul className="space-y-2">
            {topValueItems.slice(0, 5).map(item => (
              <li key={item.meatId} className="flex justify-between text-sm">
                <span className="text-[var(--text-primary)]">{item.meatName}</span>
                <span className="text-[var(--accent-green)] font-medium">
                  {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(item.totalValue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)]">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-[var(--accent-blue)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Category Breakdown</h3>
        </div>
        {categorySummary.length === 0 ? (
          <p className="text-[var(--text-secondary)]">No data</p>
        ) : (
          <ul className="space-y-2">
            {categorySummary.slice(0, 5).map((item, idx) => (
              <li key={idx} className="flex justify-between text-sm">
                <span className="text-[var(--text-primary)]">{item.category}</span>
                <span className="text-[var(--accent-blue)] font-medium">{item.count} items</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Supplier Breakdown */}
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)]">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-[var(--accent-purple)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Supplier Breakdown</h3>
        </div>
        {supplierSummary.length === 0 ? (
          <p className="text-[var(--text-secondary)]">No data</p>
        ) : (
          <ul className="space-y-2">
            {supplierSummary.slice(0, 5).map((item, idx) => (
              <li key={idx} className="flex justify-between text-sm">
                <span className="text-[var(--text-primary)]">{item.supplier}</span>
                <span className="text-[var(--accent-purple)] font-medium">{item.count} items</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default StatsCards;