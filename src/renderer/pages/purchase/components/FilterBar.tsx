// src/renderer/pages/inventory/purchases/components/FilterBar.tsx
import React from "react";
import { Search, RefreshCw } from "lucide-react";
import type { PurchaseFilters } from "../hooks/usePurchases";
import type { Supplier } from "../../../api/core/supplier";

interface FilterBarProps {
  filters: PurchaseFilters;
  onFilterChange: <K extends keyof PurchaseFilters>(key: K, value: PurchaseFilters[K]) => void;
  suppliers: Supplier[];
  onReload: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  suppliers,
  onReload,
}) => {
  return (
    <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by reference..."
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => onFilterChange("status", e.target.value)}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {suppliers.length > 0 && (
          <select
            value={filters.supplierId ?? ""}
            onChange={(e) =>
              onFilterChange("supplierId", e.target.value ? Number(e.target.value) : undefined)
            }
            className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

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

        <button
          onClick={onReload}
          className="p-2 bg-[var(--card-hover-bg)] rounded-lg hover:bg-[var(--border-color)] transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
      </div>
    </div>
  );
};