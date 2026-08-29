// src/renderer/pages/system/notification-logs/Dialogs/NotificationViewDialog.tsx
import React from "react";
import { Mail, AlertCircle, FileText, Calendar, User } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import { formatDate } from "../../../utils/formatters";
import type { NotificationLog } from "../../../api/core/notificationLog";

interface NotificationViewDialogProps {
  log: NotificationLog | null;
  isOpen: boolean;
  onClose: () => void;
}

const getStatusBadge = (status: string) => {
  const baseClasses = "px-2.5 py-1 rounded-full text-xs font-medium";
  switch (status) {
    case "sent":
      return `${baseClasses} bg-[var(--status-completed-bg)] text-[var(--status-completed)]`;
    case "queued":
      return `${baseClasses} bg-[var(--status-pending-bg)] text-[var(--status-pending)]`;
    case "failed":
      return `${baseClasses} bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]`;
    case "resend":
      return `${baseClasses} bg-[var(--status-processing-bg)] text-[var(--status-processing)]`;
    default:
      return `${baseClasses} bg-[var(--card-secondary-bg)] text-[var(--text-tertiary)]`;
  }
};

export const NotificationViewDialog: React.FC<NotificationViewDialogProps> = ({
  log,
  isOpen,
  onClose,
}) => {
  if (!log) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-[var(--accent-gold)]" />
          Notification Details #{log.id}
        </div>
      }
      size="lg"
    >
      <div className="space-y-6">
        {/* Status & ID */}
        <div className="flex items-center justify-between">
          <span className={getStatusBadge(log.status)}>
            {log.status.toUpperCase()}
          </span>
          <span className="text-sm text-[var(--text-tertiary)]">ID: #{log.id}</span>
        </div>

        {/* Recipient & Subject */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--card-secondary-bg)] rounded-lg p-3 border border-[var(--border-color)]">
            <p className="text-xs text-[var(--text-tertiary)] uppercase flex items-center gap-1">
              <User className="w-3 h-3" /> Recipient
            </p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {log.recipient_email}
            </p>
          </div>
          <div className="bg-[var(--card-secondary-bg)] rounded-lg p-3 border border-[var(--border-color)]">
            <p className="text-xs text-[var(--text-tertiary)] uppercase">Subject</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {log.subject || "(No subject)"}
            </p>
          </div>
        </div>

        {/* Payload / Body */}
        {log.payload && (
          <div className="bg-[var(--card-secondary-bg)] rounded-lg p-3 border border-[var(--border-color)]">
            <p className="text-xs text-[var(--text-tertiary)] uppercase flex items-center gap-1">
              <FileText className="w-3 h-3" /> Payload
            </p>
            <pre className="mt-1 p-3 bg-[var(--input-bg)] rounded-lg text-xs text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap max-h-60">
              {log.payload}
            </pre>
          </div>
        )}

        {/* Error Message */}
        {log.error_message && (
          <div className="bg-[var(--status-cancelled-bg)] border border-[var(--status-cancelled)]/30 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--danger-color)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-[var(--danger-color)] uppercase">Error</p>
              <p className="text-sm text-[var(--text-primary)]">{log.error_message}</p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-[var(--border-color)]">
          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Created
            </p>
            <p className="text-sm text-[var(--text-primary)]">
              {formatDate(log.created_at)}
            </p>
          </div>
          {log.sent_at && (
            <div>
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Sent</p>
              <p className="text-sm text-[var(--text-primary)]">
                {formatDate(log.sent_at)}
              </p>
            </div>
          )}
          {log.last_error_at && (
            <div>
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Last Error</p>
              <p className="text-sm text-[var(--text-primary)]">
                {formatDate(log.last_error_at)}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase">Retry Count</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {log.retry_count}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase">Resend Count</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {log.resend_count}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase">Updated</p>
            <p className="text-sm text-[var(--text-primary)]">
              {formatDate(log.updated_at)}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};