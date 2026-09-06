// src/renderer/pages/sales/transactions/components/TransactionsTable.tsx
import React from "react";
import {
  Eye,
  Printer,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  Ban,
  Wallet,
  CreditCard,
  Banknote,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Decimal from "decimal.js";
import { format } from "date-fns";
import type { Sale } from "../../../api/core/sale";
import type { PaymentMethod, SaleStatus } from "../hooks/useTransactions";

export const StatusBadge: React.FC<{ status: SaleStatus }> = ({ status }) => {
  const config = {
    initiated: {
      bg: "bg-[var(--status-processing-bg)]",
      text: "text-[var(--status-processing)]",
      icon: Clock,
      label: "Initiated",
    },
    paid: {
      bg: "bg-[var(--status-completed-bg)]",
      text: "text-[var(--status-completed)]",
      icon: CheckCircle,
      label: "Paid",
    },
    refunded: {
      bg: "bg-[var(--status-refunded-bg)]",
      text: "text-[var(--status-refunded)]",
      icon: RotateCcw,
      label: "Refunded",
    },
    voided: {
      bg: "bg-[var(--status-cancelled-bg)]",
      text: "text-[var(--status-cancelled)]",
      icon: Ban,
      label: "Voided",
    },
  }[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

export const PaymentMethodIcon: React.FC<{ method: PaymentMethod }> = ({
  method,
}) => {
  switch (method) {
    case "cash":
      return <Banknote className="w-4 h-4 text-[var(--payment-cash)]" />;
    case "card":
      return <CreditCard className="w-4 h-4 text-[var(--payment-card)]" />;
    case "wallet":
      return <Wallet className="w-4 h-4 text-[var(--payment-digital)]" />;
    default:
      return null;
  }
};

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
      className={`py-3 px-4 font-semibold text-[var(--text-tertiary)] text-xs uppercase tracking-wider cursor-pointer hover:text-[var(--primary-color)] transition-colors select-none group ${className}`}
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
interface TransactionsTableProps {
  transactions: Sale[];
  onViewDetails: (transaction: Sale) => void;
  onPrint: (transaction: Sale) => void;
  onRefund: (transaction: Sale) => void;
  reload: (params: { page: number; limit: number }) => Promise<void>;
  page?: number;
  limit?: number;
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: "asc" | "desc" };
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  onViewDetails,
  onPrint,
  onRefund,
  reload,
  page = 1,
  limit = 10,
  onSort,
  sortConfig,
}) => {
  if (transactions.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">
          No transactions found
        </p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
            <tr>
              <SortableHeader
                label="ID"
                sortKey="id"
                currentSort={sortConfig}
                onSort={onSort}
              />
              <SortableHeader
                label="Date & Time"
                sortKey="date"
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
                label="Payment"
                sortKey="payment"
                currentSort={sortConfig}
                onSort={onSort}
              />
              <SortableHeader
                label="Status"
                sortKey="status"
                currentSort={sortConfig}
                onSort={onSort}
                align="center"
              />
              <SortableHeader
                label="Total"
                sortKey="total"
                currentSort={sortConfig}
                onSort={onSort}
                align="right"
              />
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="hover:bg-[var(--table-row-hover)] transition-colors cursor-pointer"
                onClick={() => onViewDetails(tx)}
              >
                <td className="px-4 py-3 text-sm font-mono text-[var(--text-primary)]">
                  #{tx.id}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {format(new Date(tx.timestamp), "MMM dd, yyyy HH:mm")}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {tx.customer?.name || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <PaymentMethodIcon
                      method={tx.paymentMethod as PaymentMethod}
                    />
                    <span className="text-sm text-[var(--text-secondary)] capitalize">
                      {tx.paymentMethod}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={tx.status as SaleStatus} />
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-[var(--accent-gold)]">
                  ₱{new Decimal(tx.totalAmount).toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(tx);
                      }}
                      className="p-1 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-tertiary)] hover:text-[var(--accent-blue)]"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrint(tx);
                      }}
                      className="p-1 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-tertiary)] hover:text-[var(--accent-purple)]"
                      title="Print Receipt"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {tx.status === "paid" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRefund(tx);
                        }}
                        className="p-1 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-tertiary)] hover:text-[var(--accent-red)]"
                        title="Refund"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};