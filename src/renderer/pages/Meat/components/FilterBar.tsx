// src/renderer/pages/inventory/meat/components/FilterBar.tsx
import React from "react";
import { Search, X } from "lucide-react";
import type { Category } from "../../../api/core/category";
import type { Supplier } from "../../../api/core/supplier";
import type { MeatFilters } from "../hooks/useMeat";

interface FilterBarProps {
  filters: MeatFilters;
  onFilterChange: <K extends keyof MeatFilters>(key: K, value: MeatFilters[K]) => void;
  categories: Category[];
  suppliers: Supplier[];
  hasFilters: boolean;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  categories,
  suppliers,
  hasFilters,
  onReset,
}) => {
  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  return (
    <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <Search className="w-4 h-4" /> Filters
        </span>
        {hasFilters && (
          <button
            onClick={onReset}
            className="text-xs text-[var(--primary-color)] hover:underline flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by SKU, name, barcode..."
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange("status", e.target.value as MeatFilters["status"])}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Category */}
        <select
          value={filters.categoryId ?? ""}
          onChange={(e) =>
            onFilterChange("categoryId", e.target.value ? Number(e.target.value) : undefined)
          }
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Supplier */}
        <select
          value={filters.supplierId ?? ""}
          onChange={(e) =>
            onFilterChange("supplierId", e.target.value ? Number(e.target.value) : undefined)
          }
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
        >
          <option value="">All Suppliers</option>
          {suppliers.map((sup) => (
            <option key={sup.id} value={sup.id}>
              {sup.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};