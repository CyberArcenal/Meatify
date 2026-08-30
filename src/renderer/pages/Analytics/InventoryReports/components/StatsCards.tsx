// src/renderer/pages/Analytics/InventoryReports/components/StatsCards.tsx
import React from 'react';
import { TrendingUp, Layers, Truck } from 'lucide-react';
import type {
  InventorySummaryData,
  CategorySummary,
  SupplierSummary,
  MeatInventorySummary,
} from '../../../../api/analytics/inventoryReports';

interface Props {
  stats: InventorySummaryData | null;
  loading: boolean;
  topValueItems: MeatInventorySummary[];
  categorySummary: CategorySummary[];
  supplierSummary: SupplierSummary[];
}

const StatsCards: React.FC<Props> = ({
  stats,
  loading,
  topValueItems,
  categorySummary,
  supplierSummary,
}) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse h-40" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Top Value Items */}
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] hover:border-[var(--accent-gold)] transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-[var(--accent-gold)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top Value Items</h3>
        </div>
        {topValueItems.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No data</p>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {topValueItems.slice(0, 5).map((item) => (
              <li key={item.meatId} className="flex justify-between text-sm border-b border-[var(--border-light)] pb-1 last:border-0">
                <span className="text-[var(--text-primary)] truncate max-w-[150px]">{item.meatName}</span>
                <span className="text-[var(--accent-gold)] font-medium">
                  {formatCurrency(item.totalValue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] hover:border-[var(--accent-gold)] transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-[var(--accent-blue)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Category Breakdown</h3>
        </div>
        {categorySummary.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No data</p>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {categorySummary.slice(0, 5).map((item, idx) => (
              <li key={idx} className="flex justify-between text-sm border-b border-[var(--border-light)] pb-1 last:border-0">
                <span className="text-[var(--text-primary)] truncate max-w-[150px]">{item.category}</span>
                <span className="text-[var(--accent-blue)] font-medium">{item.count} items</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Supplier Breakdown */}
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] hover:border-[var(--accent-gold)] transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-[var(--accent-purple)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Supplier Breakdown</h3>
        </div>
        {supplierSummary.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No data</p>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {supplierSummary.slice(0, 5).map((item, idx) => (
              <li key={idx} className="flex justify-between text-sm border-b border-[var(--border-light)] pb-1 last:border-0">
                <span className="text-[var(--text-primary)] truncate max-w-[150px]">{item.supplier}</span>
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