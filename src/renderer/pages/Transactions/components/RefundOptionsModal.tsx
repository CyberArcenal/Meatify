// src/renderer/components/Shared/RefundOptionsModal.tsx
import React from "react";
import { RefreshCw, Trash2, Package } from "lucide-react";
import Decimal from "decimal.js";
import Button from "../../../components/UI/Button";
import Modal from "../../../components/UI/Modal";
import type { RefundOptions } from "../hooks/useRefundOptions";

interface RefundOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: RefundOptions) => void;
  saleId: number;
  saleTotal: number;
  items: Array<{ name: string; weight: number; price: number }>;
  loading?: boolean;
  // State from hook
  restockAll: boolean;
  onToggleRestockAll: () => void;
  itemStates: boolean[];
  onToggleItem: (index: number) => void;
  reason: string;
  onReasonChange: (value: string) => void;
}

export const RefundOptionsModal: React.FC<RefundOptionsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  saleId,
  saleTotal,
  items,
  loading = false,
  restockAll,
  onToggleRestockAll,
  itemStates,
  onToggleItem,
  reason,
  onReasonChange,
}) => {
  const totalRestockedWeight = items.reduce(
    (sum, item, index) => (itemStates[index] ? sum + item.weight : sum),
    0
  );
  const totalWasteWeight = items.reduce(
    (sum, item, index) => (itemStates[index] ? sum : sum + item.weight),
    0
  );

  const handleConfirm = () => {
    onConfirm({
      restock: restockAll,
      reason: reason.trim() || "Customer refund",
      restockItems: items.map((_, index) => ({
        itemIndex: index,
        restock: itemStates[index],
      })),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Refund Options - Sale #"
      size="lg"
    >
      <div className="space-y-4">
        {/* Total Amount */}
        <div className="flex justify-between items-center p-3 rounded-lg bg-[var(--card-secondary-bg)]">
          <span className="text-[var(--text-secondary)]">Total Refund Amount</span>
          <span className="text-lg font-bold text-[var(--accent-gold)]">
            ₱{new Decimal(saleTotal).toFixed(2)}
          </span>
        </div>

        {/* Restock All Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                restockAll
                  ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                  : "bg-red-100 dark:bg-red-900/30 text-red-600"
              }`}
            >
              {restockAll ? (
                <RefreshCw className="w-5 h-5" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="font-medium text-[var(--text-primary)]">
                {restockAll ? "Restock All Items" : "Mark All as Waste"}
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">
                {restockAll
                  ? "Items will be returned to inventory"
                  : "Items will be discarded (waste)"}
              </div>
            </div>
          </div>
          <button
            onClick={onToggleRestockAll}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              restockAll ? "bg-green-500" : "bg-red-500"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                restockAll ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Individual Items */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-[var(--text-secondary)]">
            Items ({items.length})
          </div>
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded-lg border border-[var(--border-color)]"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {item.name}
                </div>
                <div className="text-xs text-[var(--text-tertiary)]">
                  {new Decimal(item.weight).toFixed(3)} kg × ₱{new Decimal(item.price).toFixed(2)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-tertiary)]">
                  {itemStates[index] ? "Restock" : "Waste"}
                </span>
                <button
                  onClick={() => onToggleItem(index)}
                  className={`p-1 rounded transition-colors ${
                    itemStates[index]
                      ? "text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30"
                      : "text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                  }`}
                >
                  {itemStates[index] ? (
                    <RefreshCw className="w-4 h-4" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[var(--card-secondary-bg)] text-sm">
          <div>
            <div className="text-[var(--text-tertiary)]">Restocking</div>
            <div className="font-medium text-green-500">
              {new Decimal(totalRestockedWeight).toFixed(3)} kg
            </div>
          </div>
          <div>
            <div className="text-[var(--text-tertiary)]">Waste/Dispose</div>
            <div className="font-medium text-red-500">
              {new Decimal(totalWasteWeight).toFixed(3)} kg
            </div>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Refund Reason
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Optional reason..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
          >
            Confirm Refund
          </Button>
        </div>
      </div>
    </Modal>
  );
};