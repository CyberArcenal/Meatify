import React from 'react';
import { XCircle } from 'lucide-react';
import type { MeatInventorySummary } from '../../../../api/analytics/inventoryReports';

interface Props {
  data: MeatInventorySummary[];
  loading: boolean;
}

const OutOfStockTable: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] h-64 flex items-center justify-center">
        <div className="text-[var(--text-secondary)]">Loading out-of-stock items...</div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center gap-2">
        <XCircle className="w-5 h-5 text-[var(--danger-color)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Out of Stock</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--card-bg)]">
            <tr className="border-b border-[var(--border-color)]">
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">SKU</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Meat</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Category</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Total Stock</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Active Stock</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-[var(--text-secondary)]">No out-of-stock items.</td></tr>
            ) : (
              data.map(item => (
                <tr key={item.meatId} className="border-b border-[var(--border-light)] hover:bg-[var(--card-hover-bg)]">
                  <td className="py-3 px-5 text-[var(--text-primary)]">{item.sku}</td>
                  <td className="py-3 px-5 text-[var(--text-primary)] font-medium">{item.meatName}</td>
                  <td className="py-3 px-5 text-[var(--text-primary)]">{item.categoryName || '-'}</td>
                  <td className="py-3 px-5 text-[var(--text-primary)]">{item.totalStock}</td>
                  <td className="py-3 px-5 text-[var(--text-primary)]">{item.totalActiveStock}</td>
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