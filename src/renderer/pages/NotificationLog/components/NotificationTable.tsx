// src/renderer/pages/system/notification-logs/components/NotificationTable.tsx
import React from "react";
import { Mail, CheckCircle, XCircle, Clock, RotateCw, ChevronUp, ChevronDown, Smartphone } from "lucide-react";
import { formatDate } from "../../../utils/formatters";
import type { NotificationLog } from "../../../api/core/notificationLog";
import NotificationActionsDropdown from "./NotificationActionsDropdown";

// ─── Sortable Header Component ──────────────────────────────────────
interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: "asc" | "desc" };
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "right" | "center";
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  currentSort,
  onSort,
  className = "",
  align = "left",
}) => {
  const isActive = currentSort.key === sortKey;
  const direction = currentSort.direction;

  const handleClick = () => {
    onSort(sortKey);
  };

  return (
    <th
      className={`py-3 px-3 font-semibold text-[var(--text-tertiary)] text-xs uppercase tracking-wider cursor-pointer hover:text-[var(--primary-color)] transition-colors select-none group ${className}`}
      onClick={handleClick}
      style={{ textAlign: align }}
    >
      <div
        className={`flex items-center gap-1.5 ${
          align === "right" ? "justify-end" : align === "center" ? "justify-center" : ""
        }`}
      >
        <span className="group-hover:text-[var(--primary-color)] transition-colors">
          {label}
        </span>
        <span
          className={`inline-flex transition-all duration-200 ${
            isActive
              ? "text-[var(--primary-color)] opacity-100"
              : "text-[var(--text-tertiary)] opacity-40 group-hover:opacity-70"
          }`}
        >
          {isActive && direction === "asc" ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : isActive && direction === "desc" ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3 h-3 opacity-50" />
          )}
        </span>
      </div>
    </th>
  );
};

// ─── Status Helpers ──────────────────────────────────────────────────
const getStatusBadge = (status: string) => {
  const baseClasses = "px-2 py-1 text-xs font-medium rounded-full inline-flex items-center gap-1";
  switch (status) {
    case "sent":
      return `${baseClasses} bg-[var(--status-completed-bg)] text-[var(--status-completed)] border border-[var(--status-completed)]/20`;
    case "queued":
      return `${baseClasses} bg-[var(--status-pending-bg)] text-[var(--status-pending)] border border-[var(--status-pending)]/20`;
    case "failed":
      return `${baseClasses} bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)] border border-[var(--status-cancelled)]/20`;
    case "resend":
      return `${baseClasses} bg-[var(--status-processing-bg)] text-[var(--status-processing)] border border-[var(--status-processing)]/20`;
    default:
      return `${baseClasses} bg-[var(--card-secondary-bg)] text-[var(--text-tertiary)] border border-[var(--border-color)]/20`;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "sent":
      return <CheckCircle className="w-3 h-3" />;
    case "queued":
      return <Clock className="w-3 h-3" />;
    case "failed":
      return <XCircle className="w-3 h-3" />;
    case "resend":
      return <RotateCw className="w-3 h-3" />;
    default:
      return null;
  }
};

// ─── Channel Helper ──────────────────────────────────────────────────
const getChannelIcon = (channel: string) => {
  switch (channel) {
    case "email":
      return <Mail className="w-3.5 h-3.5" />;
    case "sms":
      return <Smartphone className="w-3.5 h-3.5" />;
    default:
      return <Mail className="w-3.5 h-3.5" />;
  }
};

const getChannelLabel = (channel: string) => {
  switch (channel) {
    case "email":
      return "Email";
    case "sms":
      return "SMS";
    default:
      return channel || "Email";
  }
};

const getChannelBadge = (channel: string) => {
  const baseClasses = "px-2 py-0.5 text-xs font-medium rounded-full inline-flex items-center gap-1";
  switch (channel) {
    case "email":
      return `${baseClasses} bg-[var(--accent-blue-light)] text-[var(--accent-blue)] border border-[var(--accent-blue)]/20`;
    case "sms":
      return `${baseClasses} bg-[var(--accent-green-light)] text-[var(--accent-green)] border border-[var(--accent-green)]/20`;
    default:
      return `${baseClasses} bg-[var(--card-secondary-bg)] text-[var(--text-tertiary)] border border-[var(--border-color)]/20`;
  }
};

// ─── Main Table Props ────────────────────────────────────────────────
interface NotificationTableProps {
  logs: NotificationLog[];
  onView: (log: NotificationLog) => void;
  onRetry: (id: number) => void;
  onResend: (id: number) => void;
  onDelete: (id: number) => void;
  sendingIds: Set<number>;
  selectedIds: number[];
  onSelectRow: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: "asc" | "desc" };
}

export const NotificationTable: React.FC<NotificationTableProps> = ({
  logs,
  onView,
  onRetry,
  onResend,
  onDelete,
  sendingIds,
  selectedIds,
  onSelectRow,
  onSelectAll,
  onSort,
  sortConfig,
}) => {
  if (logs.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-8 text-center">
        <Mail className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-primary)] font-medium">No notifications found</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Try adjusting your filters
        </p>
      </div>
    );
  }

  const allSelected = logs.length > 0 && logs.every((l) => selectedIds.includes(l.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
            <tr>
              {/* Checkbox */}
              <th className="w-8 py-3 px-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-[var(--border-color)] cursor-pointer"
                />
              </th>

              {/* Sortable Headers */}
              <SortableHeader
                label="ID"
                sortKey="id"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Recipient"
                sortKey="recipient"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Channel"
                sortKey="channel"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Subject"
                sortKey="subject"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Status"
                sortKey="status"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Retries"
                sortKey="retries"
                currentSort={sortConfig}
                onSort={onSort}
                align="center"
              />

              <SortableHeader
                label="Sent At"
                sortKey="sentAt"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <SortableHeader
                label="Created"
                sortKey="created"
                currentSort={sortConfig}
                onSort={onSort}
              />

              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {logs.map((log) => {
              const isSending = sendingIds.has(log.id);
              return (
                <tr
                  key={log.id}
                  className="hover:bg-[var(--table-row-hover)] transition-colors cursor-pointer"
                  onClick={() => onView(log)}
                >
                  <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(log.id)}
                      onChange={(e) => onSelectRow(log.id, e.target.checked)}
                      className="rounded border-[var(--border-color)] cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-sm font-mono text-[var(--text-primary)]">
                    #{log.id}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                    {log.recipient_email}
                  </td>
                  <td className="py-2.5 px-3 text-sm">
                    <span className={getChannelBadge(log.channel || "email")}>
                      {getChannelIcon(log.channel || "email")}
                      {getChannelLabel(log.channel || "email")}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)] truncate max-w-[150px]">
                    {log.subject || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-sm">
                    <span className={getStatusBadge(log.status)}>
                      {getStatusIcon(log.status)}
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-sm text-[var(--text-secondary)]">
                    {log.retry_count} / {log.resend_count}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                    {log.sent_at ? formatDate(log.sent_at) : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-[var(--text-secondary)]">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <NotificationActionsDropdown
                      log={log}
                      onView={onView}
                      onRetry={onRetry}
                      onResend={onResend}
                      onDelete={onDelete}
                      isSending={isSending}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};