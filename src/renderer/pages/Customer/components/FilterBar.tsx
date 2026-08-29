// src/renderer/pages/customer/components/FilterBar.tsx
import React from "react";
import { Search, RefreshCw, X } from "lucide-react";
import type { CustomerFilters } from "../hooks/useCustomers";

interface FilterBarProps {
  filters: CustomerFilters;
  onFilterChange: (key: keyof CustomerFilters, value: any) => void;
  hasFilters: boolean;
  onReset: () => void;
  onReload: () => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "vip", label: "VIP" },
  { value: "elite", label: "Elite" },
  { value: "regular", label: "Regular" },
];

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "points", label: "Loyalty Points" },
  { value: "createdAt", label: "Created Date" },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange("status", e.target.value as CustomerFilters["status"])}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Sort By */}
        <select
          value={filters.sortBy}
          onChange={(e) => onFilterChange("sortBy", e.target.value as CustomerFilters["sortBy"])}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort by {opt.label}
            </option>
          ))}
        </select>

        {/* Sort Order */}
        <select
          value={filters.sortOrder}
          onChange={(e) => onFilterChange("sortOrder", e.target.value as "ASC" | "DESC")}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
        >
          <option value="ASC">Ascending</option>
          <option value="DESC">Descending</option>
        </select>

        {/* Points Range */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            placeholder="Min pts"
            value={filters.minPoints || ""}
            onChange={(e) =>
              onFilterChange("minPoints", e.target.value ? Number(e.target.value) : undefined)
            }
            className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-2 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
          />
          <span className="text-[var(--text-tertiary)] text-xs">-</span>
          <input
            type="number"
            placeholder="Max pts"
            value={filters.maxPoints || ""}
            onChange={(e) =>
              onFilterChange("maxPoints", e.target.value ? Number(e.target.value) : undefined)
            }
            className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-2 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};