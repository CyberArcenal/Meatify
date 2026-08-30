// src/renderer/pages/analytics/returns/components/ReturnsTable.tsx
import React from "react";
import { Eye, RotateCcw, Beef } from "lucide-react";
import Decimal from "decimal.js";
import type { ReturnRefundReport } from "../../../../api/analytics/returnRefundReports";

interface ReturnsTableProps {
  returns: ReturnRefundReport[];
  onView: (returnRefund: ReturnRefundReport) => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles = {
    pending: "bg-[var(--status-pending-bg)] text-[var(--status-pending)]",
    processed: "bg-[var(--status-completed-bg)] text-[var(--status-completed)]",
    cancelled: "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]",
  };

  const style = styles[status as keyof typeof styles] || "";

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${style}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export const ReturnsTable: React.FC<ReturnsTableProps> = ({ returns, onView }) => {
  if (returns.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-8 text-center">
        <RotateCcw className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">No returns found</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <span className="text-[var(--accent-gold)]">↩️</span>
          Return Transactions
        </h3>
        <span className="text-sm text-[var(--text-tertiary)]">
          Total: {returns.length} entries
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
            <tr>
              <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Reference</th>
              <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Date</th>
              <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Customer</th>
              <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Items</th>
              <th className="text-left py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Method</th>
              <th className="text-right py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Amount</th>
              <th className="text-center py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Status</th>
              <th className="text-center py-3 px-5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-light)]">
            {returns.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-[var(--table-row-hover)] hover:border-l-2 hover:border-l-[var(--accent-gold)] transition-all duration-150 cursor-pointer"
                onClick={() => onView(item)}
              >
                <td className="py-3 px-5 text-sm font-mono text-[var(--text-primary)]">
                  {item.referenceNo || `#${item.id}`}
                </td>
                <td className="py-3 px-5 text-[var(--text-primary)]">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3 px-5 text-[var(--text-primary)]">
                  {item.customer?.name || item.customerName || "—"}
                </td>
                <td className="py-3 px-5 text-[var(--text-primary)]">
                  <div className="flex items-center gap-1">
                    <Beef className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span>{item.items?.length || 0}</span>
                  </div>
                </td>
                <td className="py-3 px-5 text-[var(--text-primary)] capitalize">
                  {item.refundMethod}
                </td>
                <td className="py-3 px-5 text-right font-semibold text-[var(--accent-gold)]">
                  ₱{new Decimal(item.totalAmount).toFixed(2)}
                </td>
                <td className="py-3 px-5 text-center">
                  <StatusBadge status={item.status} />
                </td>
                <td className="py-3 px-5 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(item);
                    }}
                    className="p-1.5 rounded hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
                    title="View Details"
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