// src/renderer/pages/Analytics/InventoryReports/components/OutOfStockTable.tsx
import React from 'react';
import { XCircle, Package } from 'lucide-react';
import type { MeatInventorySummary } from '../../../../api/analytics/inventoryReports';

interface Props {
  data: MeatInventorySummary[];
  loading: boolean;
}

const OutOfStockTable: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] h-64 flex items-center justify-center animate-pulse">
        <div className="text-[var(--text-secondary)]">Loading out-of-stock items...</div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm hover:border-[var(--accent-gold)] transition-colors">
      <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <XCircle className="w-5 h-5 text-[var(--danger-color)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Out of Stock</h3>
        </div>
        <span className="text-sm text-[var(--text-tertiary)]">{data.length} items</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
            <tr>
              <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">SKU</th>
              <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Meat</th>
              <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Category</th>
              <th className="text-right py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Total Stock</th>
              <th className="text-right py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Active Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-light)]">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--text-tertiary)]">
                  <Package className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)] opacity-50" />
                  No out-of-stock items found
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item.meatId}
                  className="hover:bg-[var(--table-row-hover)] hover:border-l-2 hover:border-l-[var(--accent-gold)] transition-all duration-150"
                >
                  <td className="py-3 px-5 font-mono text-[var(--text-primary)]">{item.sku}</td>
                  <td className="py-3 px-5 font-medium text-[var(--text-primary)]">{item.meatName}</td>
                  <td className="py-3 px-5 text-[var(--text-secondary)]">{item.categoryName || '—'}</td>
                  <td className="py-3 px-5 text-right">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--status-cancelled-bg)] text-[var(--danger-color)]">
                      {item.totalStock} kg
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right text-[var(--text-primary)]">{item.totalActiveStock} kg</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OutOfStockTable;