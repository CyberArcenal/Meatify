// src/renderer/pages/AuditTrail/components/FilterBar.tsx
import React from "react";
import { Search, RefreshCw } from "lucide-react";
import type { AuditFilters } from "../hooks/useAuditLogs";

interface FilterBarProps {
  filters: AuditFilters;
  onFilterChange: (key: keyof AuditFilters, value: any) => void;
  onReload: () => void;
}

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "VIEW", label: "View" },
  { value: "EXPORT", label: "Export" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "SETTINGS_CHANGE", label: "Settings Change" },
  { value: "INVENTORY_MOVEMENT", label: "Inventory Movement" },
  { value: "SALE", label: "Sale" },
  { value: "REFUND", label: "Refund" },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onReload,
}) => {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by entity ID, user, description..."
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
          />
        </div>

        {/* Action Filter */}
        <select
          value={filters.action}
          onChange={(e) => onFilterChange("action", e.target.value)}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Entity */}
        <input
          type="text"
          placeholder="Entity (e.g., Meat)"
          value={filters.entity || ""}
          onChange={(e) => onFilterChange("entity", e.target.value || undefined)}
          className="w-32 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
        />

        {/* User */}
        <input
          type="text"
          placeholder="Username"
          value={filters.user || ""}
          onChange={(e) => onFilterChange("user", e.target.value || undefined)}
          className="w-32 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
        />

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

        {/* Reload */}
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