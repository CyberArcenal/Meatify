// src/renderer/pages/inventory/suppliers/components/SupplierTable.tsx
import React from "react";
import { Beef, Check, X } from "lucide-react";
import type { Supplier } from "../../../api/core/supplier";
import SupplierActionsDropdown from "./SupplierActionsDropdown";

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

interface SupplierTableProps {
  suppliers: Supplier[];
  meatCounts: Map<number, number>;
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
  onToggleStatus: (supplier: Supplier) => void;
  selectedIds: number[];
  onSelectRow: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}

export const SupplierTable: React.FC<SupplierTableProps> = ({
  suppliers,
  meatCounts,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  selectedIds,
  onSelectRow,
  onSelectAll,
}) => {
  if (suppliers.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-8 text-center">
        <Beef className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">No suppliers found</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters or add a new supplier
        </p>
      </div>
    );
  }

  const allSelected = suppliers.length > 0 && suppliers.every((s) => selectedIds.includes(s.id));
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
                Name
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Contact
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Address
              </th>
              <th className="py-3 px-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Meats
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
            {suppliers.map((supplier) => (
              <tr
                key={supplier.id}
                className="hover:bg-[var(--table-row-hover)] transition-colors cursor-pointer"
                onClick={() => onView(supplier)}
              >
                <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(supplier.id)}
                    onChange={(e) => onSelectRow(supplier.id, e.target.checked)}
                    className="rounded border-[var(--border-color)] cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-3 text-sm font-medium text-[var(--text-primary)]">
                  {supplier.name}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)] truncate max-w-[120px]">
                  {supplier.phone || supplier.email || "—"}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)] truncate max-w-[120px]">
                  {supplier.address || "—"}
                </td>
                <td className="py-2.5 px-3 text-right text-sm font-mono text-[var(--text-primary)]">
                  {meatCounts.get(supplier.id) ?? 0}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <StatusBadge active={supplier.isActive} />
                </td>
                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <SupplierActionsDropdown
                    supplier={supplier}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleStatus={onToggleStatus}
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