// src/renderer/pages/system/notification-logs/components/BulkActionsBar.tsx
import React from "react";
import { X, Download, Trash2, RefreshCw, Send } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onRetryAll?: () => void;
  onResendAll?: () => void;
  onDeleteAll: () => void;
  onExport: () => void;
  onClearSelection: () => void;
  showRetryAll?: boolean;
  showResendAll?: boolean;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onRetryAll,
  onResendAll,
  onDeleteAll,
  onExport,
  onClearSelection,
  showRetryAll = false,
  showResendAll = false,
}) => {
  return (
    <div className="bg-[var(--primary-color)]/10 rounded-xl border border-[var(--primary-color)]/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {selectedCount} notification{selectedCount !== 1 ? "s" : ""} selected
        </span>
        <button
          onClick={onClearSelection}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Clear
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onExport}
          className="compact-button btn-secondary btn-sm flex items-center gap-1"
        >
          <Download className="w-4 h-4" /> Export
        </button>
        {showRetryAll && onRetryAll && (
          <button
            onClick={onRetryAll}
            className="compact-button btn-warning btn-sm flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" /> Retry All
          </button>
        )}
        {showResendAll && onResendAll && (
          <button
            onClick={onResendAll}
            className="compact-button btn-primary btn-sm flex items-center gap-1"
          >
            <Send className="w-4 h-4" /> Resend All
          </button>
        )}
        <button
          onClick={onDeleteAll}
          className="compact-button btn-danger btn-sm flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>
    </div>
  );
};

export default BulkActionsBar;