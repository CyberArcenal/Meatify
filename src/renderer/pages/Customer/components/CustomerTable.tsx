// src/renderer/pages/customer/components/CustomerTable.tsx
import React from "react";
import { Check, X, Users, Mail, Phone, Star } from "lucide-react";
import { type Customer } from "../../../api/core/customer";
import CustomerActionsDropdown from "./CustomerActionsDropdown";

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    vip: {
      label: "VIP",
      color: "var(--customer-vip)",
      bg: "rgba(212, 175, 55, 0.15)",
    },
    elite: {
      label: "Elite",
      color: "var(--customer-loyal)",
      bg: "rgba(243, 156, 18, 0.15)",
    },
    regular: {
      label: "Regular",
      color: "var(--customer-regular)",
      bg: "rgba(52, 152, 219, 0.15)",
    },
  };
  const config = configs[status] || configs.regular;
  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
};

const ActiveBadge: React.FC<{ active: boolean }> = ({ active }) => {
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

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onToggleStatus: (customer: Customer) => void;
  selectedIds: number[];
  onSelectRow: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  selectedIds,
  onSelectRow,
  onSelectAll,
}) => {
  if (customers.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-8 text-center">
        <Users className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">No customers found</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters or add a new customer
        </p>
      </div>
    );
  }

  const allSelected = customers.length > 0 && customers.every((c) => selectedIds.includes(c.id));
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
              <th className="py-3 px-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Points
              </th>
              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Status
              </th>
              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Active
              </th>
              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="hover:bg-[var(--table-row-hover)] transition-colors cursor-pointer"
                onClick={() => onView(customer)}
              >
                <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(customer.id)}
                    onChange={(e) => onSelectRow(customer.id, e.target.checked)}
                    className="rounded border-[var(--border-color)] cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-3 text-sm font-medium text-[var(--text-primary)]">
                  {customer.name}
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                  {customer.email ? (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                      <span className="truncate max-w-[120px]">{customer.email}</span>
                    </div>
                  ) : customer.phone ? (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                      <span>{customer.phone}</span>
                    </div>
                  ) : (
                    <span className="text-[var(--text-tertiary)]">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right text-sm font-semibold">
                  <span className="flex items-center justify-end gap-1 text-white">
                    <Star className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                    {customer.loyaltyPointsBalance}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <StatusBadge status={customer.status} />
                </td>
                <td className="py-2.5 px-3 text-center">
                  <ActiveBadge active={customer.isActive} />
                </td>
                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <CustomerActionsDropdown
                    customer={customer}
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