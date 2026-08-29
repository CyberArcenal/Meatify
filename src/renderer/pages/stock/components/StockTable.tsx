// src/renderer/pages/inventory/stock/components/StockTable.tsx
import React from "react";
import { Beef, CheckSquare, Square } from "lucide-react";
import Decimal from "decimal.js";
import type { StockMeat } from "../hooks/useStockLevels";
import StockActionsDropdown from "./StockActionsDropdown";

const StockBadge: React.FC<{ currentStock: number; reorderLevel: number }> = ({
  currentStock,
  reorderLevel,
}) => {
  if (currentStock <= 0) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--stock-outstock-bg)] text-[var(--stock-outstock)]">
        Out of Stock
      </span>
    );
  }
  if (currentStock <= reorderLevel) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--stock-lowstock-bg)] text-[var(--stock-lowstock)]">
        Low ({currentStock.toFixed(2)} kg)
      </span>
    );
  }
  return (
    <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--stock-instock-bg)] text-[var(--stock-instock)]">
      In Stock ({currentStock.toFixed(2)} kg)
    </span>
  );
};

interface StockTableProps {
  meats: StockMeat[];
  selectedIds: Set<number>;
  onToggleSelect: (meatId: number) => void;
  onSelectAll: () => void;
  onReorder: (meat: StockMeat) => void;
  onView?: (meat: StockMeat) => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  meats,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onReorder,
  onView,
}) => {
  const allSelected = meats.length > 0 && selectedIds.size === meats.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  if (meats.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-8 text-center">
        <Beef className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">No meats found</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters
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
              <th className="w-10 py-3 px-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll()}
                  className="rounded border-[var(--border-color)] cursor-pointer"
                />
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                SKU
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Name
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Supplier
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Category
              </th>
              <th className="py-3 px-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Price / kg
              </th>
              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Stock
              </th>
              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {meats.map((meat) => (
              <tr
                key={meat.id}
                className="hover:bg-[var(--table-row-hover)] transition-colors"
              >
                <td className="py-2.5 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(meat.id)}
                    onChange={() => onToggleSelect(meat.id)}
                    className="rounded border-[var(--border-color)] cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-3 text-sm font-mono text-[var(--text-secondary)]">
                  {meat.sku}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-primary)] font-medium">
                  {meat.name}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                  {meat.supplier?.name || "—"}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                  {meat.category?.name || "—"}
                </td>
                <td className="py-2.5 px-3 text-right text-sm font-semibold text-[var(--accent-gold)]">
                  ₱{new Decimal(meat.pricePerKg).toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <StockBadge
                    currentStock={meat.currentStock}
                    reorderLevel={meat.reorderLevel}
                  />
                </td>
                <td className="py-2.5 px-3 text-center">
                  <StockActionsDropdown
                    meat={meat}
                    onReorder={onReorder}
                    onView={onView}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};