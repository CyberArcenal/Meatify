// src/renderer/pages/analytics/returns/components/ReturnsTable.tsx
import React from "react";
import { Eye, RotateCcw, Package, Beef } from "lucide-react";
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
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-8 text-center">
        <RotateCcw className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">No returns found</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--table-header-bg)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Reference
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Items
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Method
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Amount
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
            {returns.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-[var(--table-row-hover)] transition-colors cursor-pointer"
                onClick={() => onView(item)}
              >
                <td className="px-4 py-3 text-sm font-mono text-[var(--text-primary)]">
                  {item.referenceNo || `#${item.id}`}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {item.customer?.name || item.customerName || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  <div className="flex items-center gap-1">
                    <Beef className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span>{item.items?.length || 0}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)] capitalize">
                  {item.refundMethod}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-[var(--accent-gold)]">
                  ₱{new Decimal(item.totalAmount).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(item);
                    }}
                    className="p-1 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-tertiary)] hover:text-[var(--accent-blue)]"
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