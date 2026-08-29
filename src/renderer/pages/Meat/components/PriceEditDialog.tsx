// src/renderer/pages/inventory/meat/components/PriceEditDialog.tsx
import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import Decimal from "decimal.js";
import meatAPI, { type Meat } from "../../../api/core/meat";
import { dialogs } from "../../../utils/dialogs";

interface PriceEditDialogProps {
  meat: Meat | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PriceEditDialog: React.FC<PriceEditDialogProps> = ({
  meat,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [newPrice, setNewPrice] = useState<number>(meat?.pricePerKg || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!meat) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPrice <= 0) {
      setError("Price must be greater than 0");
      return;
    }

    setSaving(true);
    try {
      const response = await meatAPI.updatePrice(meat.id, newPrice);
      if (response.status) {
        dialogs.alert({
          title: "Success",
          message: `Price updated to ₱${new Decimal(newPrice).toFixed(2)}`,
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update price");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Price"
      size="sm"
      closeOnClickOutside={!saving}
      closeOnEsc={!saving}
    >
      <div className="mb-4 p-3 bg-[var(--card-secondary-bg)] rounded-lg">
        <p className="text-sm text-[var(--text-primary)] font-medium">
          {meat.name}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          SKU: {meat.sku} | Current Price: ₱
          {new Decimal(meat.pricePerKg).toFixed(2)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            New Price per kg (₱) <span className="text-[var(--accent-red)]">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={newPrice}
            onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
            required
          />
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
              "Update Price"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};