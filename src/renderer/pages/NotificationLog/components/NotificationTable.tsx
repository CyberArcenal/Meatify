// src/renderer/pages/system/notification-logs/components/NotificationTable.tsx
import React from "react";
import { Mail, CheckCircle, XCircle, Clock, RotateCw } from "lucide-react";
import { formatDate } from "../../../utils/formatters";
import type { NotificationLog } from "../../../api/core/notificationLog";
import NotificationActionsDropdown from "./NotificationActionsDropdown";

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
}

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
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                ID
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Recipient
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Subject
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Status
              </th>
              <th className="py-3 px-3 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Retries
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Sent At
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Created
              </th>
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