// src/renderer/pages/system/notification-logs/components/NotificationFilterBar.tsx
import React from "react";
import { Search, RefreshCw, X } from "lucide-react";
import type { NotificationFilters } from "../hooks/useNotificationLogs";

interface NotificationFilterBarProps {
  filters: NotificationFilters;
  onFilterChange: (key: keyof NotificationFilters, value: any) => void;
  onClear: () => void;
  onRefresh: () => void;
}

export const NotificationFilterBar: React.FC<NotificationFilterBarProps> = ({
  filters,
  onFilterChange,
  onClear,
  onRefresh,
}) => {
  const hasActiveFilters = filters.status || filters.startDate || filters.endDate || filters.keyword;

  return (
    <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by recipient, subject, payload..."
            value={filters.keyword || ""}
            onChange={(e) => onFilterChange("keyword", e.target.value || undefined)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status || ""}
          onChange={(e) => onFilterChange("status", e.target.value || undefined)}
          className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
        >
          <option value="">All Statuses</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="resend">Resend</option>
        </select>

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
            onClick={onClear}
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