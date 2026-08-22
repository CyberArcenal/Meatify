// src/renderer/pages/Loyalty/components/LoyaltyTransactionsTable.tsx
import React from "react";
import { Eye, Award, TrendingDown } from "lucide-react";
import { type LoyaltyTransaction } from "../../../api/core/loyaltyTransaction";

interface LoyaltyTransactionsTableProps {
  transactions: LoyaltyTransaction[];
  onViewCustomer: (customerId: number) => void;
}

export const LoyaltyTransactionsTable: React.FC<
  LoyaltyTransactionsTableProps
> = ({ transactions, onViewCustomer }) => {
  if (transactions.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-8 text-center">
        <Award className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">
          No loyalty transactions found
        </p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters or add a new transaction
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
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[8%]">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[20%]">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[15%]">
                Date
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[10%]">
                Type
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[10%]">
                Points
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[10%]">
                Sale ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[20%]">
                Notes
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[7%]">
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
                <td className="px-4 py-3 text-sm font-mono text-[var(--text-primary)]">
                  #{tx.id}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)] font-medium">
                  {tx.customer?.name || `Customer #${tx.customerId}`}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {new Date(tx.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
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
                <td className="px-4 py-3 text-right text-sm font-semibold">
                  <span
                    className={
                      tx.pointsChange > 0
                        ? "text-[var(--accent-green)]"
                        : "text-[var(--accent-red)]"
                    }
                  >
                    {tx.pointsChange > 0 ? "+" : ""}
                    {tx.pointsChange}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-[var(--text-secondary)]">
                  {tx.saleId ? (
                    <a
                      href={`/sales/${tx.saleId}`}
                      className="text-[var(--accent-blue)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      #{tx.saleId}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)] truncate">
                  {tx.notes || "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewCustomer(tx.customerId);
                    }}
                    className="p-1 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-tertiary)] hover:text-[var(--accent-gold)]"
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