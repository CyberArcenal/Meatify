// src/renderer/pages/inventory/meat/components/MeatTable.tsx
import React from "react";
import { Eye, Edit, Trash2, Package, Check, X, Beef } from "lucide-react";
import Decimal from "decimal.js";
import type { Meat } from "../../../api/core/meat";

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => {
  return active ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[var(--status-completed-bg)] text-[var(--status-completed)]">
      <Check className="w-3 h-3" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]">
      <X className="w-3 h-3" />
      Inactive
    </span>
  );
};

interface MeatTableProps {
  meats: Meat[];
  onView: (meat: Meat) => void;
  onEdit: (meat: Meat) => void;
  onDelete: (meat: Meat) => void;
}

export const MeatTable: React.FC<MeatTableProps> = ({
  meats,
  onView,
  onEdit,
  onDelete,
}) => {
  if (meats.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-8 text-center">
        <Beef className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">
          No meat products found
        </p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters or add a new meat product
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--table-header-bg)]">
            <tr>
              <th className="w-16 px-2 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Image
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Price / kg
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {meats.map((meat) => (
              <tr
                key={meat.id}
                onClick={() => onView(meat)}
                className="hover:bg-[var(--table-row-hover)] transition-colors cursor-pointer"
              >
                <td className="w-16 px-2 py-3">
                  {meat.image ? (
                    <img
                      src={meat.image}
                      alt={meat.name}
                      className="w-10 h-10 rounded object-cover border border-[var(--border-color)] bg-[var(--card-secondary-bg)]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-[var(--card-secondary-bg)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-tertiary)]">
                      <Beef className="w-5 h-5" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-[var(--text-primary)]">
                  {meat.sku}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)] font-medium">
                  {meat.name}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {meat.category?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-[var(--accent-gold)]">
                  ₱{new Decimal(meat.pricePerKg).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge active={meat.isActive} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(meat);
                      }}
                      className="p-1 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-tertiary)] hover:text-[var(--accent-blue)]"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(meat);
                      }}
                      className="p-1 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-tertiary)] hover:text-[var(--accent-purple)]"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(meat);
                      }}
                      className="p-1 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-tertiary)] hover:text-[var(--accent-red)]"
                      title="Deactivate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};