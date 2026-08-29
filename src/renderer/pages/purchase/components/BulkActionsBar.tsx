// src/renderer/pages/inventory/purchases/components/BulkActionsBar.tsx
import React from "react";
import { X, Download, Trash2, CheckCircle, XCircle } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onApprove?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onDelete: () => void;
  onExport: () => void;
  onClearSelection: () => void;
  showApprove?: boolean;
  showComplete?: boolean;
  showCancel?: boolean;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onApprove,
  onComplete,
  onCancel,
  onDelete,
  onExport,
  onClearSelection,
  showApprove = false,
  showComplete = false,
  showCancel = false,
}) => {
  return (
    <div className="bg-[var(--primary-color)]/10 rounded-xl border border-[var(--primary-color)]/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {selectedCount} purchase{selectedCount !== 1 ? "s" : ""} selected
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
        {showApprove && onApprove && (
          <button
            onClick={onApprove}
            className="compact-button btn-warning btn-sm flex items-center gap-1"
          >
            <CheckCircle className="w-4 h-4" /> Approve
          </button>
        )}
        {showComplete && onComplete && (
          <button
            onClick={onComplete}
            className="compact-button btn-success btn-sm flex items-center gap-1"
          >
            <CheckCircle className="w-4 h-4" /> Complete
          </button>
        )}
        {showCancel && onCancel && (
          <button
            onClick={onCancel}
            className="compact-button btn-danger btn-sm flex items-center gap-1"
          >
            <XCircle className="w-4 h-4" /> Cancel
          </button>
        )}
        <button
          onClick={onDelete}
          className="compact-button btn-danger btn-sm flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>
    </div>
  );
};

export default BulkActionsBar;