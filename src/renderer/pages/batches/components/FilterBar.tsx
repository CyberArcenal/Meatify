// src/renderer/pages/inventory/batches/components/FilterBar.tsx
import React from "react";
import { Search, RefreshCw, X } from "lucide-react";
import type { BatchFilters } from "../hooks/useBatches";

interface FilterBarProps {
  filters: BatchFilters;
  onFilterChange: <K extends keyof BatchFilters>(key: K, value: BatchFilters[K]) => void;
  hasFilters: boolean;
  onReset: () => void;
  onReload: () => void;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "depleted", label: "Depleted" },
  { value: "expired", label: "Expired" },
  { value: "on_hold", label: "On Hold" },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  hasFilters,
  onReset,
  onReload,
}) => {
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by batch code..."
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange("status", e.target.value)}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Meat ID */}
        <input
          type="number"
          placeholder="Meat ID"
          value={filters.meatId || ""}
          onChange={(e) =>
            onFilterChange("meatId", e.target.value ? Number(e.target.value) : undefined)
          }
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
        />

        {/* Supplier ID */}
        <input
          type="number"
          placeholder="Supplier ID"
          value={filters.supplierId || ""}
          onChange={(e) =>
            onFilterChange("supplierId", e.target.value ? Number(e.target.value) : undefined)
          }
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
        />

        {/* Expiry Range */}
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={filters.expiryDateFrom || ""}
            onChange={(e) => onFilterChange("expiryDateFrom", e.target.value || undefined)}
            className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-2 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
            placeholder="From"
          />
          <span className="text-[var(--text-tertiary)] text-xs">to</span>
          <input
            type="date"
            value={filters.expiryDateTo || ""}
            onChange={(e) => onFilterChange("expiryDateTo", e.target.value || undefined)}
            className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-2 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
            placeholder="To"
          />
        </div>
      </div>

      {/* Remaining Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-secondary)] whitespace-nowrap">Remaining:</label>
          <input
            type="number"
            placeholder="Min"
            value={filters.minRemaining || ""}
            onChange={(e) =>
              onFilterChange("minRemaining", e.target.value ? Number(e.target.value) : undefined)
            }
            className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
          />
          <span className="text-[var(--text-tertiary)] text-xs">to</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxRemaining || ""}
            onChange={(e) =>
              onFilterChange("maxRemaining", e.target.value ? Number(e.target.value) : undefined)
            }
            className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};