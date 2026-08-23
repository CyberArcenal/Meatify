// src/renderer/pages/inventory/stock/components/StockFilterBar.tsx
import React from "react";
import { Search, RefreshCw } from "lucide-react";
import type { StockFilters } from "../hooks/useStockLevels";
import type { Supplier } from "../../../api/core/supplier";
import type { Category } from "../../../api/core/category";

interface StockFilterBarProps {
  filters: StockFilters;
  suppliers: Supplier[];
  categories: Category[];
  onFilterChange: <K extends keyof StockFilters>(
    key: K,
    value: StockFilters[K]
  ) => void;
  onReload: () => void;
}

export const StockFilterBar: React.FC<StockFilterBarProps> = ({
  filters,
  suppliers,
  categories,
  onFilterChange,
  onReload,
}) => {
  return (
    <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by name, SKU, barcode..."
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
          />
        </div>

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

        <select
          value={filters.categoryId ?? ""}
          onChange={(e) =>
            onFilterChange("categoryId", e.target.value ? Number(e.target.value) : undefined)
          }
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filters.stockStatus}
          onChange={(e) => onFilterChange("stockStatus", e.target.value as StockFilters["stockStatus"])}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
        >
          <option value="all">All Stock</option>
          <option value="instock">In Stock</option>
          <option value="lowstock">Low Stock</option>
          <option value="outstock">Out of Stock</option>
        </select>

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