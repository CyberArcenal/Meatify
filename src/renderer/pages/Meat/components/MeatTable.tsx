// src/renderer/pages/inventory/meat/components/MeatTable.tsx
import React from "react";
import { Check, X, Beef, ChevronUp, ChevronDown } from "lucide-react";
import Decimal from "decimal.js";
import type { Meat } from "../../../api/core/meat";
import MeatActionsDropdown from "./MeatActionsDropdown";

// ─── Status Badge ──────────────────────────────────────────────────────
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

// ─── Sortable Header Component ──────────────────────────────────────
interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: "asc" | "desc" };
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "right" | "center";
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  currentSort,
  onSort,
  className = "",
  align = "left",
}) => {
  const isActive = currentSort.key === sortKey;
  const direction = currentSort.direction;

  const handleClick = () => {
    onSort(sortKey);
  };

  return (
    <th
      className={`py-3 px-3 font-semibold text-[var(--text-tertiary)] text-xs uppercase tracking-wider cursor-pointer hover:text-[var(--primary-color)] transition-colors select-none group ${className}`}
      onClick={handleClick}
      style={{ textAlign: align }}
    >
      <div
        className={`flex items-center gap-1.5 ${
          align === "right" ? "justify-end" : align === "center" ? "justify-center" : ""
        }`}
      >
        <span className="group-hover:text-[var(--primary-color)] transition-colors">
          {label}
        </span>
        <span
          className={`inline-flex transition-all duration-200 ${
            isActive
              ? "text-[var(--primary-color)] opacity-100"
              : "text-[var(--text-tertiary)] opacity-40 group-hover:opacity-70"
          }`}
        >
          {isActive && direction === "asc" ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : isActive && direction === "desc" ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3 h-3 opacity-50" />
          )}
        </span>
      </div>
    </th>
  );
};

// ─── Main Table Props ────────────────────────────────────────────────
interface MeatTableProps {
  meats: Meat[];
  onView: (meat: Meat) => void;
  onEdit: (meat: Meat) => void;
  onDelete: (meat: Meat) => void;
  onToggleStatus: (meat: Meat) => void;
  onPriceEdit: (meat: Meat) => void;
  onReorderLevelEdit: (meat: Meat) => void;
  onReorderQtyEdit: (meat: Meat) => void;
  selectedIds: number[];
  onSelectRow: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  // Sorting
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: "asc" | "desc" };
}

export const MeatTable: React.FC<MeatTableProps> = ({
  meats,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  onPriceEdit,
  onReorderLevelEdit,
  onReorderQtyEdit,
  selectedIds,
  onSelectRow,
  onSelectAll,
  onSort,
  sortConfig,
}) => {
  if (meats.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-8 text-center">
        <Beef className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">No meat products found</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters or add a new meat product
        </p>
      </div>
    );
  }

  const allSelected = meats.length > 0 && meats.every((m) => selectedIds.includes(m.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
            <tr>
              {/* Checkbox */}
              <th className="w-8 py-3 px-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-[var(--border-color)] cursor-pointer"
                />
              </th>

              {/* Image column – not sortable */}
              <th className="w-12 py-3 px-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Image
              </th>

              {/* Sortable Headers */}
              <SortableHeader
                label="SKU"
                sortKey="sku"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Name"
                sortKey="name"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Category"
                sortKey="category"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Price / kg"
                sortKey="pricePerKg"
                currentSort={sortConfig}
                onSort={onSort}
                align="right"
              />

              <SortableHeader
                label="Status"
                sortKey="isActive"
                currentSort={sortConfig}
                onSort={onSort}
                align="center"
              />

              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-color)]">
            {meats.map((meat) => (
              <tr
                key={meat.id}
                className="hover:bg-[var(--table-row-hover)] transition-colors cursor-pointer"
                onClick={() => onView(meat)}
              >
                <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(meat.id)}
                    onChange={(e) => onSelectRow(meat.id, e.target.checked)}
                    className="rounded border-[var(--border-color)] cursor-pointer"
                  />
                </td>

                <td className="py-2.5 px-2">
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

                <td className="py-2.5 px-3 text-sm font-mono text-[var(--text-primary)]">
                  {meat.sku}
                </td>

                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)] font-medium">
                  {meat.name}
                </td>

                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                  {meat.category?.name ?? "—"}
                </td>

                <td className="py-2.5 px-3 text-right text-sm font-semibold text-[var(--accent-gold)]">
                  ₱{new Decimal(meat.pricePerKg).toFixed(2)}
                </td>

                <td className="py-2.5 px-3 text-center">
                  <StatusBadge active={meat.isActive} />
                </td>

                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <MeatActionsDropdown
                    meat={meat}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleStatus={onToggleStatus}
                    onPriceEdit={onPriceEdit}
                    onReorderLevelEdit={onReorderLevelEdit}
                    onReorderQtyEdit={onReorderQtyEdit}
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