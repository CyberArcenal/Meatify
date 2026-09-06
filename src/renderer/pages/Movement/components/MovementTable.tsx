// src/renderer/pages/inventory/movements/components/MovementTable.tsx
import React from "react";
import { Package, Beef, ChevronUp, ChevronDown } from "lucide-react";
import {
  formatMovementType,
  getMovementTypeColor,
} from "../hooks/useMovements";
import type { InventoryMovement } from "../../../api/core/inventoryMovement";
import MovementActionsDropdown from "./MovementActionsDropdown";

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
interface MovementTableProps {
  movements: InventoryMovement[];
  onView: (movement: InventoryMovement) => void;
  selectedIds: number[];
  onSelectRow: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: "asc" | "desc" };
}

export const MovementTable: React.FC<MovementTableProps> = ({
  movements,
  onView,
  selectedIds,
  onSelectRow,
  onSelectAll,
  onSort,
  sortConfig,
}) => {
  if (movements.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-8 text-center">
        <Package className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">No movements found</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters
        </p>
      </div>
    );
  }

  const allSelected = movements.length > 0 && movements.every((m) => selectedIds.includes(m.id));
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

              {/* Sortable Headers */}
              <SortableHeader
                label="ID"
                sortKey="id"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Date & Time"
                sortKey="date"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Meat"
                sortKey="meat"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Batch"
                sortKey="batch"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Qty Change"
                sortKey="qtyChange"
                currentSort={sortConfig}
                onSort={onSort}
                align="right"
              />

              <SortableHeader
                label="Type"
                sortKey="type"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Sale"
                sortKey="sale"
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
            {movements.map((movement) => (
              <tr
                key={movement.id}
                className="hover:bg-[var(--table-row-hover)] transition-colors cursor-pointer"
                onClick={() => onView(movement)}
              >
                <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(movement.id)}
                    onChange={(e) => onSelectRow(movement.id, e.target.checked)}
                    className="rounded border-[var(--border-color)] cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-3 text-sm font-mono text-[var(--text-primary)]">
                  #{movement.id}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                  {new Date(movement.timestamp).toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                  {movement.meat ? (
                    <div className="flex items-center gap-1.5">
                      <Beef className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">
                          {movement.meat.name}
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)] font-mono">
                          {movement.meat.sku}
                        </div>
                      </div>
                    </div>
                  ) : (
                    `Meat ID: ${movement.meatId}`
                  )}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)] font-mono">
                  {movement.batch?.batchCode || (movement.batchId ? `#${movement.batchId}` : "—")}
                </td>
                <td className="py-2.5 px-3 text-right text-sm font-semibold">
                  <span
                    className={movement.qtyChange > 0 ? "text-[var(--success-color)]" : "text-[var(--danger-color)]"}
                  >
                    {movement.qtyChange > 0 ? "+" : ""}
                    {movement.qtyChange}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-sm">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${getMovementTypeColor(movement.movementType)}20`,
                      color: getMovementTypeColor(movement.movementType),
                    }}
                  >
                    {formatMovementType(movement.movementType)}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center text-sm text-[var(--text-secondary)]">
                  {movement.saleId ? (
                    <span className="px-2 py-0.5 rounded bg-[var(--card-secondary-bg)] font-mono">
                      #{movement.saleId}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <MovementActionsDropdown movement={movement} onView={onView} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};