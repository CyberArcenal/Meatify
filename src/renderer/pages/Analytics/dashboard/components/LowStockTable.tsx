// src/renderer/pages/Dashboard/components/LowStockTable.tsx
import React from "react";
import { AlertTriangle, Package } from "lucide-react";
import type { InventoryItem } from "../../../../api/analytics/dashboard";

interface Props {
  items: InventoryItem[];
  isLoading: boolean;
}

const LowStockTable: React.FC<Props> = ({ items, isLoading }) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(val);

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm hover:border-[var(--accent-gold)] transition-colors h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-[var(--accent-amber)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Low Stock Items
        </h3>
        {!isLoading && items.length > 0 && (
          <span className="ml-auto text-sm text-[var(--text-tertiary)]">
            {items.length} items
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-[var(--card-secondary-bg)] animate-pulse rounded" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)] opacity-50" />
            <div className="text-[var(--text-tertiary)]">No low stock items</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--card-bg)]">
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-2 px-2 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  SKU
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  Name
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  Qty
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--border-light)] hover:bg-[var(--table-row-hover)] transition-colors"
                >
                  <td className="py-2 px-2 text-[var(--text-primary)] font-mono text-xs">
                    {item.sku}
                  </td>
                  <td className="py-2 px-2 text-[var(--text-primary)]">
                    {item.name}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span
                      className={`font-bold ${
                        item.stockQty < 5
                          ? "text-[var(--danger-color)]"
                          : "text-[var(--accent-amber)]"
                      }`}
                    >
                      {item.stockQty}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-primary)]">
                    {formatCurrency(item.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LowStockTable;