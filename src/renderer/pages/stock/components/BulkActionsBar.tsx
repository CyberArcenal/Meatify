// src/renderer/pages/inventory/stock/components/BulkActionsBar.tsx
import React from "react";
import { X, Download, ShoppingCart } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onReorder: () => void;
  onExport: () => void;
  onClearSelection: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onReorder,
  onExport,
  onClearSelection,
}) => {
  return (
    <div className="bg-[var(--primary-color)]/10 rounded-xl border border-[var(--primary-color)]/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {selectedCount} meat{selectedCount !== 1 ? "s" : ""} selected
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
        <button
          onClick={onReorder}
          className="compact-button btn-primary btn-sm flex items-center gap-1"
        >
          <ShoppingCart className="w-4 h-4" /> Reorder Selected
        </button>
      </div>
    </div>
  );
};

export default BulkActionsBar;