// src/renderer/pages/inventory/batches/components/BatchFormDialog.tsx
import React, { useState } from "react";
import {
  Loader2,
  Save,
  Package,
  Calendar,
  Hash,
  Calculator,
} from "lucide-react";
import Modal from "../../../components/UI/Modal";
import type { Batch } from "../../../api/core/batch";
import batchAPI from "../../../api/core/batch";
import { dialogs } from "../../../utils/dialogs";
import MeatSelect from "../../../components/Selects/Meat";
import SupplierSelect from "../../../components/Selects/Supplier";
import { useBatchForm } from "../hooks/useBatchForm";
import { formatCurrency } from "../../../utils/formatters";

interface BatchFormDialogProps {
  isOpen: boolean;
  batch: Batch | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const BatchFormDialog: React.FC<BatchFormDialogProps> = ({
  isOpen,
  batch,
  onClose,
  onSuccess,
}) => {
  const {
    form,
    error,
    setError,
    totalCost,
    handleChange,
    handleMeatChange,
    handleSupplierChange,
    resetForm,
  } = useBatchForm(batch);

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.meatId || form.meatId === 0) {
      setError("Please select a meat.");
      return;
    }
    if (form.quantity <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }
    if (form.unitCost <= 0) {
      setError("Unit cost must be greater than 0.");
      return;
    }
    if (!form.expiryDate) {
      setError("Please select an expiry date.");
      return;
    }

    setSaving(true);
    try {
      if (batch) {
        const res = await batchAPI.update(batch.id, {
          batchCode: form.batchCode || undefined,
          unitCost: form.unitCost,
          expiryDate: form.expiryDate,
          note: form.note || undefined,
        });
        if (!res.status) throw new Error(res.message);
        dialogs.success(`Batch ${form.batchCode} updated successfully.`);
      } else {
        const res = await batchAPI.create({
          meatId: form.meatId,
          quantity: form.quantity,
          unitCost: form.unitCost,
          expiryDate: form.expiryDate,
          supplierId: form.supplierId,
          note: form.note || undefined,
          batchCode: form.batchCode || undefined,
        });
        if (!res.status) throw new Error(res.message);
        dialogs.success(`Batch ${res.data.batchCode} created successfully.`);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={batch ? "Edit Batch" : "Create New Batch"}
      size="lg"
      closeOnClickOutside={!saving}
      closeOnEsc={!saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-[var(--status-cancelled-bg)] border border-[var(--accent-red)] rounded-lg p-3 text-sm text-[var(--accent-red)]">
            {error}
          </div>
        )}

        {!batch && (
          <>
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                Meat <span className="text-[var(--accent-red)]">*</span>
              </label>
              <MeatSelect
                value={form.meatId || null}
                onChange={handleMeatChange}
                placeholder="Select meat..."
                activeOnly
              />
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                Unit cost will be auto-filled from meat price.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                Supplier
              </label>
              <SupplierSelect
                value={form.supplierId || null}
                onChange={handleSupplierChange}
                placeholder="Select supplier..."
                activeOnly
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Batch Code
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              name="batchCode"
              value={form.batchCode}
              onChange={handleChange}
              placeholder="Auto-generated if empty"
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
            />
          </div>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Leave empty to auto-generate
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
              Quantity (kg) <span className="text-[var(--accent-red)]">*</span>
            </label>
            <input
              type="number"
              name="quantity"
              value={form.quantity || ""}
              onChange={handleChange}
              required
              min="0.01"
              step="0.01"
              disabled={!!batch}
              className={`w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] ${
                batch ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
            {batch && (
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                Quantity cannot be changed after creation
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
              Unit Cost (₱) <span className="text-[var(--accent-red)]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] text-sm">
                ₱
              </span>
              <input
                type="number"
                name="unitCost"
                value={form.unitCost || ""}
                onChange={handleChange}
                required
                min="0.01"
                step="0.01"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-8 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              />
            </div>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Auto-filled from meat price; you can override.
            </p>
          </div>
        </div>

        {/* ✅ Total Cost Display – auto-updates with quantity or unitCost */}
        <div className="bg-[var(--card-secondary-bg)] rounded-lg p-3 border border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[var(--accent-gold)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Total Cost:
            </span>
          </div>
          <span className="text-lg font-bold text-[var(--accent-gold)]">
            {formatCurrency(totalCost.toFixed(2))}
          </span>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Expiry Date <span className="text-[var(--accent-red)]">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="date"
              name="expiryDate"
              value={form.expiryDate}
              onChange={handleChange}
              required
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Note
          </label>
          <textarea
            name="note"
            value={form.note}
            onChange={handleChange}
            rows={3}
            placeholder="Additional notes about this batch..."
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-5 py-2.5 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {batch ? "Update Batch" : "Create Batch"}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
