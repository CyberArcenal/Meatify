// src/renderer/pages/customer/components/CustomerTable.tsx
import React from "react";
import { Eye, Edit, Trash2, Users, Mail, Phone } from "lucide-react";
import { type Customer } from "../../../api/core/customer";

const getCustomerStatus = (
  customer: Customer
): { label: string; color: string } => {
  switch (customer.status) {
    case "vip":
      return { label: "VIP", color: "var(--customer-vip)" };
    case "elite":
      return { label: "Elite", color: "var(--customer-loyal)" };
    case "regular":
      return { label: "Regular", color: "var(--customer-regular)" };
    default:
      return { label: "Regular", color: "var(--customer-regular)" };
  }
};

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  onView,
  onEdit,
  onDelete,
}) => {
  if (customers.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-8 text-center">
        <Users className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">
          No customers found
        </p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters or add a new customer
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
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[10%]">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[25%]">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[30%]">
                Contact
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[15%]">
                Points
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[10%]">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-[10%]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {customers.map((customer) => {
              const status = getCustomerStatus(customer);
              const contactIcon = customer.email ? (
                <Mail className="w-3 h-3" />
              ) : customer.phone ? (
                <Phone className="w-3 h-3" />
              ) : null;
              const contactText = customer.email || customer.phone || null;

              return (
                <tr
                  key={customer.id}
                  onClick={() => onView(customer)}
                  className="hover:bg-[var(--table-row-hover)] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-mono text-[var(--text-primary)]">
                    #{customer.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)] font-medium">
                    {customer.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {contactText ? (
                      <div className="flex items-center gap-1">
                        {contactIcon}
                        <span className="truncate">{contactText}</span>
                      </div>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-[var(--accent-purple)]">
                    {customer.loyaltyPointsBalance}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-flex px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${status.color}20`,
                        color: status.color,
                      }}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(customer);
                        }}
                        className="p-1 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-tertiary)] hover:text-[var(--accent-gold)]"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(customer);
                        }}
                        className="p-1 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-tertiary)] hover:text-[var(--accent-gold)]"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(customer);
                        }}
                        className="p-1 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-tertiary)] hover:text-[var(--accent-red)]"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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