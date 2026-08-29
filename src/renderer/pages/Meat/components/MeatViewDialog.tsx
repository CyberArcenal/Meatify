// src/renderer/pages/inventory/meat/components/MeatViewDialog.tsx
import React from "react";
import { Loader2, Package, Check, Beef, Calendar, X } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import Decimal from "decimal.js";
import { format } from "date-fns";
import type { Meat } from "../../../api/core/meat";
import type { Batch } from "../../../api/core/batch";

interface MeatViewDialogProps {
  meat: Meat | null;
  batches: Batch[];
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const MeatViewDialog: React.FC<MeatViewDialogProps> = ({
  meat,
  batches,
  loading,
  isOpen,
  onClose,
}) => {
  if (!meat) return null;

  const totalStock = batches.reduce((sum, b) => sum + b.remainingQuantity, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Beef className="w-5 h-5 text-[var(--accent-gold)]" />
          {meat.name}
        </div>
      }
      size="lg"
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--text-tertiary)] uppercase">SKU</p>
              <p className="text-sm font-mono text-[var(--text-primary)]">{meat.sku}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Barcode</p>
              <p className="text-sm font-mono text-[var(--text-primary)]">
                {meat.barcode || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Category</p>
              <p className="text-sm text-[var(--text-primary)]">
                {meat.category?.name || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Supplier</p>
              <p className="text-sm text-[var(--text-primary)]">
                {meat.supplier?.name || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Price per kg</p>
              <p className="text-lg font-bold text-[var(--accent-gold)]">
                ₱{new Decimal(meat.pricePerKg).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Status</p>
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  meat.isActive
                    ? "bg-[var(--status-completed-bg)] text-[var(--status-completed)]"
                    : "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]"
                }`}
              >
                {meat.isActive ? (
                  <>
                    <Check className="w-3 h-3" /> Active
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3" /> Inactive
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Description */}
          {meat.description && (
            <div className="pt-4 border-t border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Description</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {meat.description}
              </p>
            </div>
          )}

          {/* Batches */}
          <div className="pt-4 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[var(--text-tertiary)] uppercase flex items-center gap-2">
                <Package className="w-4 h-4" />
                Inventory Batches
              </p>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Total: {totalStock} kg
              </span>
            </div>

            {batches.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                No batches available
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="bg-[var(--card-secondary-bg)] rounded-lg p-3 border border-[var(--border-color)]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {batch.batchCode}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-[var(--text-tertiary)]">
                            Remaining:{" "}
                            <span className="font-semibold text-[var(--text-primary)]">
                              {batch.remainingQuantity} kg
                            </span>
                          </span>
                          <span className="text-xs text-[var(--text-tertiary)]">
                            Unit Cost: ₱{new Decimal(batch.unitCost).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            batch.status === "active"
                              ? "bg-[var(--status-completed-bg)] text-[var(--status-completed)]"
                              : batch.status === "expired"
                              ? "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]"
                              : batch.status === "depleted"
                              ? "bg-[var(--stock-outstock-bg)] text-[var(--stock-outstock)]"
                              : "bg-[var(--status-pending-bg)] text-[var(--status-pending)]"
                          }`}
                        >
                          {batch.status}
                        </span>
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">
                          Expires: {format(new Date(batch.expiryDate), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-[var(--border-color)] flex justify-between text-xs text-[var(--text-tertiary)]">
            <span>Created: {format(new Date(meat.createdAt), "MMM dd, yyyy h:mm a")}</span>
            {meat.updatedAt && (
              <span>Updated: {format(new Date(meat.updatedAt), "MMM dd, yyyy h:mm a")}</span>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};