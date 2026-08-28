import React from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Repeat } from 'lucide-react';
import type { InventoryMovement } from '../../../../api/core/inventoryMovement';


interface Props {
  data: InventoryMovement[];
  loading: boolean;
}

const MovementsTable: React.FC<Props> = ({ data, loading }) => {
  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'sale': return <ArrowDownRight className="w-4 h-4 text-[var(--status-completed)]" />;
      case 'purchase': return <ArrowUpRight className="w-4 h-4 text-[var(--accent-green)]" />;
      case 'return': return <RefreshCw className="w-4 h-4 text-[var(--accent-amber)]" />;
      case 'adjustment': return <Repeat className="w-4 h-4 text-[var(--accent-blue)]" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] h-64 flex items-center justify-center">
        <div className="text-[var(--text-secondary)]">Loading movements...</div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-color)]">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent Inventory Movements</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--card-bg)]">
            <tr className="border-b border-[var(--border-color)]">
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Time</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Meat</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Type</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">Qty Change</th>
              <th className="text-left py-3 px-5 text-[var(--text-secondary)] font-medium">New Stock</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-[var(--text-secondary)]">No movements found.</td></tr>
            ) : (
              data.map(movement => (
                <tr key={movement.id} className="border-b border-[var(--border-light)] hover:bg-[var(--card-hover-bg)]">
                  <td className="py-3 px-5 text-[var(--text-primary)]">{new Date(movement.timestamp).toLocaleString()}</td>
                  <td className="py-3 px-5 text-[var(--text-primary)] font-medium">
                    {movement.meat?.name || `Meat #${movement.meatId}`}
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-1">
                      {getMovementIcon(movement.type)}
                      <span className="capitalize">{movement.type}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <span className={movement.qtyChange > 0 ? 'text-[var(--accent-green)]' : 'text-[var(--danger-color)]'}>
                      {movement.qtyChange > 0 ? `+${movement.qtyChange}` : movement.qtyChange}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-[var(--text-primary)]">{movement.newStockQty}</td>
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