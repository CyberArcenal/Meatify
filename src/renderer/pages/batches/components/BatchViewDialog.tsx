// src/renderer/pages/inventory/batches/components/BatchViewDialog.tsx
import React from "react";
import { Package, Calendar, User, Building2, DollarSign, Hash } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import Decimal from "decimal.js";
import type { Batch } from "../../../api/core/batch";

interface BatchViewDialogProps {
  isOpen: boolean;
  batch: Batch | null;
  onClose: () => void;
}

export const BatchViewDialog: React.FC<BatchViewDialogProps> = ({
  isOpen,
  batch,
  onClose,
}) => {
  if (!batch) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string }> = {
      active: { bg: "bg-[var(--status-completed-bg)]", text: "text-[var(--status-completed)]" },
      depleted: { bg: "bg-[var(--stock-outstock-bg)]", text: "text-[var(--stock-outstock)]" },
      expired: { bg: "bg-[var(--status-cancelled-bg)]", text: "text-[var(--status-cancelled)]" },
      on_hold: { bg: "bg-[var(--status-pending-bg)]", text: "text-[var(--status-pending)]" },
    };
    const config = configs[status] || configs.active;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  const usagePercentage = batch.initialQuantity > 0
    ? ((batch.initialQuantity - batch.remainingQuantity) / batch.initialQuantity) * 100
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[var(--accent-gold)]" />
          Batch Details - {batch.batchCode}
        </div>
      }
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Batch Code</p>
              <p className="text-lg font-bold font-mono text-[var(--text-primary)]">{batch.batchCode}</p>
            </div>
            <div>{getStatusBadge(batch.status)}</div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase flex items-center gap-1">
              <User className="w-3 h-3" /> Meat
            </p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {batch.meat?.name || `#${batch.meatId}`}
            </p>
            {batch.meat?.sku && (
              <p className="text-xs text-[var(--text-tertiary)]">SKU: {batch.meat.sku}</p>
            )}
          </div>

          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Supplier
            </p>
            <p className="text-sm text-[var(--text-primary)]">
              {batch.supplier?.name || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Received Date
            </p>
            <p className="text-sm text-[var(--text-primary)]">{formatDate(batch.receivedDate)}</p>
          </div>

          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Expiry Date
            </p>
            <p className="text-sm text-[var(--text-primary)]">{formatDate(batch.expiryDate)}</p>
          </div>

          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase">Initial Quantity</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {batch.initialQuantity} kg
            </p>
          </div>

          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase">Remaining Quantity</p>
            <p className="text-sm font-semibold" style={{ color: "var(--accent-gold)" }}>
              {batch.remainingQuantity} kg
            </p>
          </div>

          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Unit Cost
            </p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              ₱{new Decimal(batch.unitCost).toFixed(2)}
            </p>
          </div>

          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase">Usage</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-[var(--card-secondary-bg)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(usagePercentage, 100)}%`,
                    backgroundColor: usagePercentage > 80 ? "var(--accent-red)" : "var(--accent-gold)",
                  }}
                />
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {usagePercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Note */}
        {batch.note && (
          <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
            <p className="text-xs text-[var(--text-tertiary)] uppercase">Note</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{batch.note}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t border-[var(--border-color)] flex justify-between text-xs text-[var(--text-tertiary)]">
          <span>Created: {formatDate(batch.createdAt)}</span>
          {batch.updatedAt && (
            <span>Updated: {formatDate(batch.updatedAt)}</span>
          )}
        </div>
      </div>
    </Modal>
  );
};