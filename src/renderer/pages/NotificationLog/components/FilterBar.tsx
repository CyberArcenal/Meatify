// src/renderer/pages/system/notification-logs/components/FilterBar.tsx
import React from "react";
import { Search, RefreshCw, X } from "lucide-react";
import type { NotificationFilters } from "../hooks/useNotificationLogs";

interface FilterBarProps {
  filters: NotificationFilters;
  onFilterChange: (key: keyof NotificationFilters, value: any) => void;
  hasFilters: boolean;
  onReset: () => void;
  onReload: () => void;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "queued", label: "Queued" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "resend", label: "Resend" },
];

const SORT_OPTIONS = [
  { value: "created_at", label: "Created Date" },
  { value: "sent_at", label: "Sent Date" },
  { value: "recipient_email", label: "Recipient" },
  { value: "status", label: "Status" },
  { value: "retry_count", label: "Retry Count" },
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
            placeholder="Search by recipient, subject..."
            value={filters.keyword || ""}
            onChange={(e) => onFilterChange("keyword", e.target.value || undefined)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status || ""}
          onChange={(e) => onFilterChange("status", e.target.value || undefined)}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Date Range - From */}
        <input
          type="date"
          value={filters.startDate || ""}
          onChange={(e) => onFilterChange("startDate", e.target.value || undefined)}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
          placeholder="From"
        />

        {/* Date Range - To */}
        <input
          type="date"
          value={filters.endDate || ""}
          onChange={(e) => onFilterChange("endDate", e.target.value || undefined)}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
          placeholder="To"
        />

        {/* Sort By */}
        <select
          value={filters.sortBy || "created_at"}
          onChange={(e) => onFilterChange("sortBy", e.target.value)}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort by {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sort Order */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--text-secondary)]">Order:</span>
        <div className="flex gap-2">
          <label className="flex items-center gap-1.5 text-sm text-[var(--text-primary)] cursor-pointer">
            <input
              type="radio"
              name="sortOrder"
              value="ASC"
              checked={filters.sortOrder === "ASC"}
              onChange={(e) => onFilterChange("sortOrder", "ASC")}
              className="text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
            />
            Ascending
          </label>
          <label className="flex items-center gap-1.5 text-sm text-[var(--text-primary)] cursor-pointer">
            <input
              type="radio"
              name="sortOrder"
              value="DESC"
              checked={filters.sortOrder === "DESC"}
              onChange={(e) => onFilterChange("sortOrder", "DESC")}
              className="text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
            />
            Descending
          </label>
        </div>
      </div>
    </div>
  );
};