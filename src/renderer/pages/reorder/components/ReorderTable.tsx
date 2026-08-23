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
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-8 text-center">
        <Beef className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">
          No low‑stock meats
        </p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          All meats are above their reorder level.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-[var(--table-header-bg)]">
          <tr>
            <th className="w-8 px-4 py-3">
              <button
                onClick={onSelectAll}
                className="text-[var(--text-tertiary)] hover:text-[var(--accent-gold)]"
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase">
              Meat
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase">
              SKU
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase">
              Current Stock (kg)
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase">
              Reorder Level
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase">
              Reorder Qty (kg)
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase">
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
              <td className="w-8 px-4 py-3">
                <button
                  onClick={() => onToggleSelect(meat.id)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--accent-gold)]"
                >
                  {selectedIds.has(meat.id) ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </td>
              <td className="px-4 py-3 text-sm text-[var(--text-primary)] font-medium">
                {meat.name}
              </td>
              <td className="px-4 py-3 text-sm font-mono text-[var(--text-secondary)]">
                {meat.sku}
              </td>
              <td className="px-4 py-3 text-right text-sm">
                <span className="font-semibold text-[var(--accent-red)]">
                  {meat.currentStock.toFixed(2)}
                </span>
                <span className="text-xs text-[var(--text-tertiary)] ml-1">
                  kg
                </span>
              </td>
              <td className="px-4 py-3 text-right text-sm text-[var(--text-secondary)]">
                {meat.reorderLevel} kg
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-[var(--accent-gold)]">
                {meat.reorderQty} kg
              </td>
              <td className="px-4 py-3 text-right text-sm text-[var(--accent-gold)]">
                ₱{new Decimal(meat.pricePerKg).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};