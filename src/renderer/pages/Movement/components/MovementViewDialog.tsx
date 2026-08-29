// src/renderer/pages/inventory/movements/components/MovementViewDialog.tsx
import React from "react";
import {
  Package,
  Calendar,
  Hash,
  FileText,
  ExternalLink,
  Boxes,
  Beef,
} from "lucide-react";
import Modal from "../../../components/UI/Modal";
import {
  formatMovementType,
  getMovementTypeColor,
} from "../hooks/useMovements";
import type { InventoryMovement } from "../../../api/core/inventoryMovement";

interface MovementViewDialogProps {
  isOpen: boolean;
  movement: InventoryMovement | null;
  onClose: () => void;
}

export const MovementViewDialog: React.FC<MovementViewDialogProps> = ({
  isOpen,
  movement,
  onClose,
}) => {
  if (!movement) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[var(--accent-gold)]" />
          Movement Details #{movement.id}
        </div>
      }
      size="lg"
    >
      <div className="space-y-6">
        {/* Meat & Batch Info */}
        <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Beef className="w-4 h-4" />
            Meat & Batch
          </h3>
          {movement.meat ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">SKU</p>
                <p className="font-mono text-[var(--text-primary)]">
                  {movement.meat.sku}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Name</p>
                <p className="text-[var(--text-primary)] font-medium">
                  {movement.meat.name}
                </p>
              </div>
              {movement.batch && (
                <div className="col-span-2">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase flex items-center gap-1">
                    <Boxes className="w-3 h-3" /> Batch Code
                  </p>
                  <p className="text-[var(--text-primary)] font-mono">
                    {movement.batch.batchCode}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[var(--text-secondary)]">
              Meat ID: {movement.meatId}
              {movement.batchId && `, Batch ID: ${movement.batchId}`}
            </p>
          )}
        </div>

        {/* Movement Details */}
        <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Movement
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-[var(--text-tertiary)] uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Date & Time
              </p>
              <p className="text-[var(--text-primary)]">
                {new Date(movement.timestamp).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Type</p>
              <span
                className="inline-flex px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${getMovementTypeColor(movement.movementType)}20`,
                  color: getMovementTypeColor(movement.movementType),
                }}
              >
                {formatMovementType(movement.movementType)}
              </span>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Quantity Change</p>
              <p
                className={`text-lg font-bold ${
                  movement.qtyChange > 0 ? "text-[var(--success-color)]" : "text-[var(--danger-color)]"
                }`}
              >
                {movement.qtyChange > 0 ? "+" : ""}
                {movement.qtyChange}
              </p>
            </div>
            {movement.saleId && (
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Linked Sale
                </p>
                <span className="font-mono text-[var(--text-primary)]">
                  #{movement.saleId}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {movement.notes && (
          <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes
            </h3>
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
              {movement.notes}
            </p>
          </div>
        )}

        {/* Audit Info */}
        <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Audit Trail
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-tertiary)]">
            <div>
              <span className="uppercase">Created</span>
              <p className="text-[var(--text-secondary)]">
                {new Date(movement.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="uppercase">Last Updated</span>
              <p className="text-[var(--text-secondary)]">
                {movement.updatedAt
                  ? new Date(movement.updatedAt).toLocaleString()
                  : "Never"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};