// src/renderer/pages/inventory/meat/components/ReorderQtyEditDialog.tsx
import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import meatAPI, { type Meat } from "../../../api/core/meat";
import { dialogs } from "../../../utils/dialogs";

interface ReorderQtyEditDialogProps {
  meat: Meat | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReorderQtyEditDialog: React.FC<ReorderQtyEditDialogProps> = ({
  meat,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [newQty, setNewQty] = useState<number>(meat?.reorderQty || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!meat) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newQty < 0) {
      setError("Reorder quantity cannot be negative");
      return;
    }

    setSaving(true);
    try {
      // Note: If the Meat entity doesn't have reorderQty, you may need to
      // store this in a separate setting or extend the Meat type.
      const response = await meatAPI.update(meat.id, {
        // @ts-ignore - if reorderQty exists in your Meat type
        reorderQty: newQty,
      });
      if (response.status) {
        dialogs.alert({
          title: "Success",
          message: `Reorder quantity updated to ${newQty}`,
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update reorder quantity");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Reorder Quantity"
      size="sm"
      closeOnClickOutside={!saving}
      closeOnEsc={!saving}
    >
      <div className="mb-4 p-3 bg-[var(--card-secondary-bg)] rounded-lg">
        <p className="text-sm text-[var(--text-primary)] font-medium">
          {meat.name}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          SKU: {meat.sku} | Current Reorder Quantity: {meat.reorderQty ?? "Not set"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            New Reorder Quantity <span className="text-[var(--accent-red)]">*</span>
          </label>
          <input
            type="number"
            step="1"
            min="0"
            value={newQty}
            onChange={(e) => setNewQty(parseInt(e.target.value) || 0)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
            required
          />
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            When reorder is triggered, this quantity will be suggested for ordering.
          </p>
        </div>

        {error && (
          <div className="p-2 bg-[var(--status-cancelled-bg)] border border-[var(--accent-red)] rounded text-sm text-[var(--accent-red)]">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue-hover)] disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Quantity"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};