// src/renderer/pages/analytics/returns/components/FilterBar.tsx
import React from "react";
import { Filter, X, RefreshCw, Search } from "lucide-react";
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
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-[var(--accent-gold)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Filters</h3>
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-[var(--accent-gold-light)] text-[var(--accent-gold)]">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
          <button
            onClick={onRefresh}
            className="p-1.5 rounded hover:bg-[var(--card-hover-bg)] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Reference, reason..."
              value={filters.search}
              onChange={(e) => onFilterChange("search", e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Refund Method</label>
          <select
            value={filters.refundMethod}
            onChange={(e) => onFilterChange("refundMethod", e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition"
          >
            {refundMethods.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Customer ID</label>
          <input
            type="number"
            placeholder="e.g., 5"
            value={filters.customerId || ""}
            onChange={(e) =>
              onFilterChange("customerId", e.target.value ? Number(e.target.value) : undefined)
            }
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Start Date</label>
          <input
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => onFilterChange("startDate", e.target.value || undefined)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">End Date</label>
          <input
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => onFilterChange("endDate", e.target.value || undefined)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition"
          />
        </div>
      </div>
    </div>
  );
};