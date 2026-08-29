// src/renderer/pages/inventory/purchases/components/PurchaseTable.tsx
import React from "react";
import { ShoppingCart, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import Decimal from "decimal.js";
import { type Purchase } from "../../../api/core/purchase";
import PurchaseActionsDropdown from "./PurchaseActionsDropdown";

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const configs: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
    pending: {
      icon: <Clock className="w-3 h-3" />,
      bg: "bg-[var(--status-pending-bg)]",
      text: "text-[var(--status-pending)]",
    },
    approved: {
      icon: <AlertCircle className="w-3 h-3" />,
      bg: "bg-[var(--status-processing-bg)]",
      text: "text-[var(--status-processing)]",
    },
    completed: {
      icon: <CheckCircle className="w-3 h-3" />,
      bg: "bg-[var(--status-completed-bg)]",
      text: "text-[var(--status-completed)]",
    },
    cancelled: {
      icon: <XCircle className="w-3 h-3" />,
      bg: "bg-[var(--status-cancelled-bg)]",
      text: "text-[var(--status-cancelled)]",
    },
  };
  const config = configs[status] || configs.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

interface PurchaseTableProps {
  purchases: Purchase[];
  onView: (purchase: Purchase) => void;
  onEdit: (purchase: Purchase) => void;
  onDelete: (purchase: Purchase) => void;
  onStatusUpdate: (purchase: Purchase) => void;
  selectedIds: number[];
  onSelectRow: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}

export const PurchaseTable: React.FC<PurchaseTableProps> = ({
  purchases,
  onView,
  onEdit,
  onDelete,
  onStatusUpdate,
  selectedIds,
  onSelectRow,
  onSelectAll,
}) => {
  if (purchases.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-8 text-center">
        <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">No purchases found</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters or create a new purchase
        </p>
      </div>
    );
  }

  const allSelected = purchases.length > 0 && purchases.every((p) => selectedIds.includes(p.id));
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
                Ref #
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Date
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Supplier
              </th>
              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Status
              </th>
              <th className="py-3 px-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Total
              </th>
              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {purchases.map((purchase) => (
              <tr
                key={purchase.id}
                className="hover:bg-[var(--table-row-hover)] transition-colors cursor-pointer"
                onClick={() => onView(purchase)}
              >
                <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(purchase.id)}
                    onChange={(e) => onSelectRow(purchase.id, e.target.checked)}
                    className="rounded border-[var(--border-color)] cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-3 text-sm font-mono text-[var(--text-primary)]">
                  {purchase.referenceNo || `#${purchase.id}`}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                  {new Date(purchase.orderDate).toLocaleDateString()}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                  {purchase.supplier?.name || "—"}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <StatusBadge status={purchase.status} />
                </td>
                <td className="py-2.5 px-3 text-right text-sm font-semibold text-[var(--accent-gold)]">
                  ₱{new Decimal(purchase.totalAmount).toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <PurchaseActionsDropdown
                    purchase={purchase}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusUpdate={onStatusUpdate}
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