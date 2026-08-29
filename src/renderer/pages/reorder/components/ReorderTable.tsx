// src/renderer/pages/inventory/reorder/components/ReorderTable.tsx
import React from "react";
import { Package, CheckSquare, Square, Beef } from "lucide-react";
import type { LowStockMeat } from "../hooks/useReorder";
import Decimal from "decimal.js";

interface ReorderTableProps {
  meats: LowStockMeat[];
  selectedIds: Set<number>;
  onToggleSelect: (meatId: number) => void;
  onSelectAll: () => void;
}

export const ReorderTable: React.FC<ReorderTableProps> = ({
  meats,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}) => {
  const allSelected = meats.length > 0 && selectedIds.size === meats.length;

  if (meats.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-8 text-center">
        <Beef className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">No low-stock meats</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          All meats are above their reorder level.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
            <tr>
              <th className="w-10 py-3 px-3">
                <button
                  onClick={onSelectAll}
                  className="text-[var(--text-tertiary)] hover:text-[var(--accent-gold)] transition-colors"
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Meat
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                SKU
              </th>
              <th className="py-3 px-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Current Stock
              </th>
              <th className="py-3 px-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Reorder Level
              </th>
              <th className="py-3 px-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Reorder Qty
              </th>
              <th className="py-3 px-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Price / kg
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {meats.map((meat) => (
              <tr
                key={meat.id}
                className="hover:bg-[var(--table-row-hover)] transition-colors"
              >
                <td className="w-10 py-2.5 px-3">
                  <button
                    onClick={() => onToggleSelect(meat.id)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--accent-gold)] transition-colors"
                  >
                    {selectedIds.has(meat.id) ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-primary)] font-medium">
                  {meat.name}
                </td>
                <td className="py-2.5 px-3 text-sm font-mono text-[var(--text-secondary)]">
                  {meat.sku}
                </td>
                <td className="py-2.5 px-3 text-right text-sm">
                  <span className="font-semibold text-[var(--danger-color)]">
                    {meat.currentStock.toFixed(2)}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)] ml-1">kg</span>
                </td>
                <td className="py-2.5 px-3 text-right text-sm text-[var(--text-secondary)]">
                  {meat.reorderLevel} kg
                </td>
                <td className="py-2.5 px-3 text-right text-sm font-medium text-[var(--accent-gold)]">
                  {meat.reorderQty} kg
                </td>
                <td className="py-2.5 px-3 text-right text-sm font-semibold text-[var(--accent-gold)]">
                  ₱{new Decimal(meat.pricePerKg).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};