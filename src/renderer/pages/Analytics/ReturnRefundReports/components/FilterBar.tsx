// src/renderer/pages/analytics/returns/components/FilterBar.tsx
import React from "react";
import { Search, RefreshCw, X } from "lucide-react";
import type { ReturnFilters } from "../hooks/useReturnRefunds";

interface FilterBarProps {
  filters: ReturnFilters;
  onFilterChange: (key: keyof ReturnFilters, value: any) => void;
  onRefresh: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onRefresh,
}) => {
  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.refundMethod ||
    filters.startDate ||
    filters.endDate ||
    filters.customerId;

  const statuses = [
    { value: "", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "processed", label: "Processed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const refundMethods = [
    { value: "", label: "All Methods" },
    { value: "cash", label: "Cash" },
    { value: "card", label: "Card" },
    { value: "wallet", label: "Wallet" },
  ];

  const handleClearFilters = () => {
    onFilterChange("search", "");
    onFilterChange("status", "");
    onFilterChange("refundMethod", "");
    onFilterChange("startDate", undefined);
    onFilterChange("endDate", undefined);
    onFilterChange("customerId", undefined);
  };

  return (
    <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by reference, reason, customer..."
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange("status", e.target.value)}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Refund Method */}
        <select
          value={filters.refundMethod}
          onChange={(e) => onFilterChange("refundMethod", e.target.value)}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
        >
          {refundMethods.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Customer ID */}
        <div className="w-32">
          <input
            type="number"
            placeholder="Customer ID"
            value={filters.customerId || ""}
            onChange={(e) =>
              onFilterChange("customerId", e.target.value ? Number(e.target.value) : undefined)
            }
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
          />
        </div>

        {/* Date Range */}
        <input
          type="date"
          value={filters.startDate || ""}
          onChange={(e) => onFilterChange("startDate", e.target.value || undefined)}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
        />
        <span className="text-[var(--text-tertiary)]">to</span>
        <input
          type="date"
          value={filters.endDate || ""}
          onChange={(e) => onFilterChange("endDate", e.target.value || undefined)}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
        />

        {/* Actions */}
        <button
          onClick={onRefresh}
          className="p-2 bg-[var(--card-hover-bg)] rounded-lg hover:bg-[var(--border-color)] transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="p-2 bg-[var(--accent-red-light)] rounded-lg hover:bg-[var(--accent-red)]/20 transition-colors"
            title="Clear Filters"
          >
            <X className="w-4 h-4 text-[var(--accent-red)]" />
          </button>
        )}
      </div>
    </div>
  );
};