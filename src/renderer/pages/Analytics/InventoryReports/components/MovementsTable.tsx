// src/renderer/pages/Analytics/InventoryReports/components/MovementsTable.tsx
import React from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Repeat, Package } from 'lucide-react';
import type { InventoryMovement } from '../../../../api/core/inventoryMovement';

interface Props {
  data: InventoryMovement[];
  loading: boolean;
}

const MovementsTable: React.FC<Props> = ({ data, loading }) => {
  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <ArrowDownRight className="w-4 h-4 text-[var(--status-completed)]" />;
      case 'purchase':
        return <ArrowUpRight className="w-4 h-4 text-[var(--accent-green)]" />;
      case 'return':
        return <RefreshCw className="w-4 h-4 text-[var(--accent-amber)]" />;
      case 'adjustment':
        return <Repeat className="w-4 h-4 text-[var(--accent-blue)]" />;
      default:
        return <Repeat className="w-4 h-4 text-[var(--text-tertiary)]" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] h-64 flex items-center justify-center animate-pulse">
        <div className="text-[var(--text-secondary)]">Loading movements...</div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm hover:border-[var(--accent-gold)] transition-colors">
      <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <span className="text-[var(--accent-gold)]">📋</span>
          Recent Inventory Movements
        </h3>
        <span className="text-sm text-[var(--text-tertiary)]">{data.length} entries</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
            <tr>
              <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Time</th>
              <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Meat</th>
              <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Type</th>
              <th className="text-right py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Qty Change</th>
              <th className="text-right py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">New Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-light)]">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--text-tertiary)]">
                  <Package className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)] opacity-50" />
                  No movements found
                </td>
              </tr>
            ) : (
              data.map((movement) => (
                <tr
                  key={movement.id}
                  className="hover:bg-[var(--table-row-hover)] hover:border-l-2 hover:border-l-[var(--accent-gold)] transition-all duration-150"
                >
                  <td className="py-3 px-5 text-[var(--text-primary)]">
                    {new Date(movement.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-5 font-medium text-[var(--text-primary)]">
                    {movement.meat?.name || `Meat #${movement.meatId}`}
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-1.5">
                      {getMovementIcon(movement.type)}
                      <span className="capitalize text-[var(--text-secondary)]">{movement.type}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <span
                      className={`font-medium ${
                        movement.qtyChange > 0
                          ? 'text-[var(--success-color)]'
                          : 'text-[var(--danger-color)]'
                      }`}
                    >
                      {movement.qtyChange > 0 ? `+${movement.qtyChange}` : movement.qtyChange} kg
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right text-[var(--text-primary)] font-medium">
                    {movement.newStockQty} kg
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MovementsTable;