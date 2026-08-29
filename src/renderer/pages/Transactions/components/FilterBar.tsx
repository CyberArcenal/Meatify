// src/renderer/pages/sales/transactions/components/FilterBar.tsx
import React from "react";
import { Search, Calendar, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";
import type { TransactionFilters, PaymentMethod, SaleStatus } from "../hooks/useTransactions";

interface FilterBarProps {
  filters: TransactionFilters;
  onFilterChange: (key: keyof TransactionFilters, value: any) => void;
  hasFilters: boolean;
  onReset: () => void;
  onReload: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  hasFilters,
  onReset,
  onReload,
}) => {
  const [dateRange, setDateRange] = React.useState<"today" | "week" | "month" | "custom">("today");

  const handleDateRangeChange = (range: "today" | "week" | "month" | "custom") => {
    setDateRange(range);
    const now = new Date();
    let start = "";
    let end = format(now, "yyyy-MM-dd");
    if (range === "today") {
      start = format(now, "yyyy-MM-dd");
    } else if (range === "week") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      start = format(weekStart, "yyyy-MM-dd");
    } else if (range === "month") {
      const monthStart = new Date(now);
      monthStart.setMonth(now.getMonth() - 1);
      start = format(monthStart, "yyyy-MM-dd");
    }
    onFilterChange("startDate", start);
    onFilterChange("endDate", end);
  };

  return (
    <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <Search className="w-4 h-4" /> Filters
        </span>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={onReset}
              className="text-xs text-[var(--primary-color)] hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
          <button
            onClick={onReload}
            className="p-1.5 rounded hover:bg-[var(--card-hover-bg)] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--text-tertiary)]" />
          <select
            value={dateRange}
            onChange={(e) => handleDateRangeChange(e.target.value as any)}
            className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Custom date inputs */}
        {dateRange === "custom" && (
          <>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFilterChange("startDate", e.target.value)}
              className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
            />
            <span className="text-[var(--text-tertiary)] self-center">–</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFilterChange("endDate", e.target.value)}
              className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
            />
          </>
        )}

        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by ID, customer, SKU..."
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
          />
        </div>

        {/* Payment Method */}
        <select
          value={filters.paymentMethod}
          onChange={(e) => onFilterChange("paymentMethod", e.target.value as PaymentMethod)}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
        >
          <option value="">All Payments</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="wallet">Wallet</option>
        </select>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange("status", e.target.value as SaleStatus)}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
        >
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
          <option value="voided">Voided</option>
        </select>
      </div>
    </div>
  );
};