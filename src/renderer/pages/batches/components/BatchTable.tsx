// src/renderer/pages/inventory/batches/components/BatchTable.tsx
import React from "react";
import { Check, X, Package, Beef, Calendar, ChevronUp, ChevronDown } from "lucide-react";
import Decimal from "decimal.js";
import type { Batch } from "../../../api/core/batch";
import BatchActionsDropdown from "./BatchActionsDropdown";

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const configs: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    active: {
      bg: "bg-[var(--status-completed-bg)]",
      text: "text-[var(--status-completed)]",
      icon: <Check className="w-3 h-3" />,
    },
    depleted: {
      bg: "bg-[var(--stock-outstock-bg)]",
      text: "text-[var(--stock-outstock)]",
      icon: <X className="w-3 h-3" />,
    },
    expired: {
      bg: "bg-[var(--status-cancelled-bg)]",
      text: "text-[var(--status-cancelled)]",
      icon: <X className="w-3 h-3" />,
    },
    on_hold: {
      bg: "bg-[var(--status-pending-bg)]",
      text: "text-[var(--status-pending)]",
      icon: <Package className="w-3 h-3" />,
    },
  };

  const config = configs[status] || configs.active;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {status.replace("_", " ")}
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
interface BatchTableProps {
  batches: Batch[];
  onView: (batch: Batch) => void;
  onEdit: (batch: Batch) => void;
  onDelete: (batch: Batch) => void;
  onToggleStatus: (batch: Batch) => void;
  selectedIds: number[];
  onSelectRow: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: "asc" | "desc" };
}

export const BatchTable: React.FC<BatchTableProps> = ({
  batches,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  selectedIds,
  onSelectRow,
  onSelectAll,
  onSort,
  sortConfig,
}) => {
  if (batches.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-8 text-center">
        <Package className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">No batches found</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters or create a new batch
        </p>
      </div>
    );
  }

  const allSelected = batches.length > 0 && batches.every((b) => selectedIds.includes(b.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpiringSoon = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

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
                label="Batch Code"
                sortKey="batchCode"
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
                label="Supplier"
                sortKey="supplier"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Received"
                sortKey="receivedDate"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Expiry"
                sortKey="expiryDate"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Remaining"
                sortKey="remainingQuantity"
                currentSort={sortConfig}
                onSort={onSort}
                align="right"
              />

              <SortableHeader
                label="Unit Cost"
                sortKey="unitCost"
                currentSort={sortConfig}
                onSort={onSort}
                align="right"
              />

              <SortableHeader
                label="Status"
                sortKey="status"
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
            {batches.map((batch) => {
              const expiringSoon = isExpiringSoon(batch.expiryDate);
              return (
                <tr
                  key={batch.id}
                  className="hover:bg-[var(--table-row-hover)] transition-colors cursor-pointer"
                  onClick={() => onView(batch)}
                >
                  <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(batch.id)}
                      onChange={(e) => onSelectRow(batch.id, e.target.checked)}
                      className="rounded border-[var(--border-color)] cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-sm font-mono text-[var(--text-primary)]">
                    {batch.batchCode}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Beef className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                      {batch.meat?.name || `#${batch.meatId}`}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                    {batch.supplier?.name || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                    {formatDate(batch.receivedDate)}
                  </td>
                  <td className="py-2.5 px-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                      <span className={expiringSoon ? "text-[var(--warning-color)] font-medium" : "text-[var(--text-secondary)]"}>
                        {formatDate(batch.expiryDate)}
                      </span>
                      {expiringSoon && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--status-pending-bg)] text-[var(--status-pending)]">
                          Soon
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-sm font-semibold text-[var(--text-primary)]">
                    {batch.remainingQuantity.toFixed(2)} kg
                  </td>
                  <td className="py-2.5 px-3 text-right text-sm font-mono text-[var(--text-secondary)]">
                    ₱{new Decimal(batch.unitCost).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <StatusBadge status={batch.status} />
                  </td>
                  <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <BatchActionsDropdown
                      batch={batch}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onToggleStatus={onToggleStatus}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};