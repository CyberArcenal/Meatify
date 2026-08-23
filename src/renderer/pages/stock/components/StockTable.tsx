// src/renderer/pages/inventory/stock/components/StockTable.tsx
import React from "react";
import { Beef, CheckSquare, Square, ShoppingCart } from "lucide-react";
import type { StockMeat } from "../hooks/useStockLevels";
import Decimal from "decimal.js";

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
}

export const StockTable: React.FC<StockTableProps> = ({
  meats,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onReorder,
}) => {
  const allSelected = meats.length > 0 && selectedIds.size === meats.length;

  if (meats.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-8 text-center">
        <Beef className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">
          No meats found
        </p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full table-fixed">
          <thead className="bg-[var(--table-header-bg)] sticky top-0 z-10">
            <tr>
              <th className="w-12 px-4 py-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
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
              <th className="w-24 px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                SKU
              </th>
              <th className="w-48 px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Name
              </th>
              <th className="w-36 px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Supplier
              </th>
              <th className="w-32 px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Category
              </th>
              <th className="w-24 px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Price / kg
              </th>
              <th className="w-32 px-4 py-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Stock
              </th>
              <th className="w-20 px-4 py-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {meats.map((meat) => (
              <tr
                key={meat.id}
                className="hover:bg-[var(--table-row-hover)] transition-colors"
              >
                <td className="w-12 px-4 py-3 text-center">
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
                <td className="w-24 px-4 py-3 text-sm font-mono text-[var(--text-secondary)] truncate">
                  {meat.sku}
                </td>
                <td className="w-48 px-4 py-3 text-sm text-[var(--text-primary)] font-medium truncate">
                  {meat.name}
                </td>
                <td className="w-36 px-4 py-3 text-sm text-[var(--text-secondary)] truncate">
                  {meat.supplier?.name || "—"}
                </td>
                <td className="w-32 px-4 py-3 text-sm text-[var(--text-secondary)] truncate">
                  {meat.category?.name || "—"}
                </td>
                <td className="w-24 px-4 py-3 text-right text-sm text-[var(--accent-gold)] font-semibold">
                  ₱{new Decimal(meat.pricePerKg).toFixed(2)}
                </td>
                <td className="w-32 px-4 py-3 text-center">
                  <StockBadge
                    currentStock={meat.currentStock}
                    reorderLevel={meat.reorderLevel}
                  />
                </td>
                <td className="w-20 px-4 py-3 text-center">
                  <button
                    onClick={() => onReorder(meat)}
                    className="p-1 text-[var(--text-tertiary)] hover:text-[var(--accent-gold)] transition-colors"
                    title="Reorder"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};