// src/renderer/pages/Loyalty/components/LoyaltyTransactionsTable.tsx
import React from "react";
import { Eye, Award, TrendingDown, User, ChevronUp, ChevronDown } from "lucide-react";
import { type LoyaltyTransaction } from "../../../api/core/loyaltyTransaction";

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
interface LoyaltyTransactionsTableProps {
  transactions: LoyaltyTransaction[];
  onViewCustomer: (customerId: number) => void;
  selectedIds: number[];
  onSelectRow: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: "asc" | "desc" };
}

export const LoyaltyTransactionsTable: React.FC<LoyaltyTransactionsTableProps> = ({
  transactions,
  onViewCustomer,
  selectedIds,
  onSelectRow,
  onSelectAll,
  onSort,
  sortConfig,
}) => {
  if (transactions.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-8 text-center">
        <Award className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">No loyalty transactions found</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters or create a new transaction
        </p>
      </div>
    );
  }

  const allSelected = transactions.length > 0 && transactions.every((t) => selectedIds.includes(t.id));
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
                label="Customer"
                sortKey="customer"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Date"
                sortKey="date"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Type"
                sortKey="type"
                currentSort={sortConfig}
                onSort={onSort}
                align="center"
              />

              <SortableHeader
                label="Points"
                sortKey="points"
                currentSort={sortConfig}
                onSort={onSort}
                align="right"
              />

              <SortableHeader
                label="Sale"
                sortKey="sale"
                currentSort={sortConfig}
                onSort={onSort}
                align="center"
              />

              <SortableHeader
                label="Notes"
                sortKey="notes"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="hover:bg-[var(--table-row-hover)] transition-colors cursor-pointer"
                onClick={() => onViewCustomer(tx.customerId)}
              >
                <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(tx.id)}
                    onChange={(e) => onSelectRow(tx.id, e.target.checked)}
                    className="rounded border-[var(--border-color)] cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-3 text-sm font-mono text-[var(--text-primary)]">
                  #{tx.id}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)] font-medium">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    {tx.customer?.name || `Customer #${tx.customerId}`}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                  {new Date(tx.timestamp).toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-center">
                  {tx.pointsChange > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[var(--status-completed-bg)] text-[var(--status-completed)]">
                      <Award className="w-3 h-3" />
                      Earn
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]">
                      <TrendingDown className="w-3 h-3" />
                      Redeem
                    </span>
                  )}
                </td>
                <td
                  className={`py-2.5 px-3 text-right text-sm font-semibold ${
                    tx.pointsChange > 0 ? "text-[var(--success-color)]" : "text-[var(--danger-color)]"
                  }`}
                >
                  {tx.pointsChange > 0 ? "+" : ""}
                  {tx.pointsChange}
                </td>
                <td className="py-2.5 px-3 text-center text-sm text-[var(--text-secondary)]">
                  {tx.saleId ? (
                    <span className="px-2 py-0.5 rounded bg-[var(--card-secondary-bg)] font-mono">
                      #{tx.saleId}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)] truncate max-w-[120px]">
                  {tx.notes || "—"}
                </td>
                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onViewCustomer(tx.customerId)}
                    className="p-1.5 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-tertiary)] hover:text-[var(--accent-gold)] transition-colors"
                    title="View Customer Loyalty"
                  >
                    <Eye className="w-4 h-4" />
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