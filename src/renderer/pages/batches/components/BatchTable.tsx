// src/renderer/pages/inventory/batches/components/BatchTable.tsx
import React from "react";
import { Check, X, Package, Beef, Calendar, DollarSign } from "lucide-react";
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

interface BatchTableProps {
  batches: Batch[];
  onView: (batch: Batch) => void;
  onEdit: (batch: Batch) => void;
  onDelete: (batch: Batch) => void;
  onToggleStatus: (batch: Batch) => void;
  selectedIds: number[];
  onSelectRow: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
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
                Batch Code
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Meat
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Supplier
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Received
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Expiry
              </th>
              <th className="py-3 px-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Remaining
              </th>
              <th className="py-3 px-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Unit Cost
              </th>
              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Status
              </th>
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
                    {batch.remainingQuantity} kg
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