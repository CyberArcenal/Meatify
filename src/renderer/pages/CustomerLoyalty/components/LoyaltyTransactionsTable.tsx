// src/renderer/pages/Loyalty/components/LoyaltyTransactionsTable.tsx
import React from "react";
import { Eye, Award, TrendingDown, User } from "lucide-react";
import { type LoyaltyTransaction } from "../../../api/core/loyaltyTransaction";

interface LoyaltyTransactionsTableProps {
  transactions: LoyaltyTransaction[];
  onViewCustomer: (customerId: number) => void;
  selectedIds: number[];
  onSelectRow: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}

export const LoyaltyTransactionsTable: React.FC<LoyaltyTransactionsTableProps> = ({
  transactions,
  onViewCustomer,
  selectedIds,
  onSelectRow,
  onSelectAll,
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
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                ID
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Customer
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Date
              </th>
              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Type
              </th>
              <th className="py-3 px-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Points
              </th>
              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Sale
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Notes
              </th>
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