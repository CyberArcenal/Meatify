// src/renderer/pages/inventory/batches/components/BatchFormDialog.tsx
import React, { useState, useEffect } from "react";
import { Loader2, Save, Package, Calendar, DollarSign, Hash } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import type { Batch } from "../../../api/core/batch";
import batchAPI from "../../../api/core/batch";
import { dialogs } from "../../../utils/dialogs";
import MeatSelect from "../../../components/Selects/Meat";
import SupplierSelect from "../../../components/Selects/Supplier";

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
  const [form, setForm] = useState({
    meatId: 0,
    quantity: 0,
    unitCost: 0,
    expiryDate: "",
    supplierId: undefined as number | undefined,
    note: "",
    batchCode: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (batch) {
      setForm({
        meatId: batch.meatId,
        quantity: batch.initialQuantity,
        unitCost: batch.unitCost,
        expiryDate: batch.expiryDate,
        supplierId: batch.supplierId || undefined,
        note: batch.note || "",
        batchCode: batch.batchCode,
      });
    } else {
      setForm({
        meatId: 0,
        quantity: 0,
        unitCost: 0,
        expiryDate: "",
        supplierId: undefined,
        note: "",
        batchCode: "",
      });
    }
  }, [batch, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
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
        // Update existing batch
        const res = await batchAPI.update(batch.id, {
          batchCode: form.batchCode || undefined,
          unitCost: form.unitCost,
          expiryDate: form.expiryDate,
          note: form.note || undefined,
        });
        if (!res.status) throw new Error(res.message);
        dialogs.success(`Batch ${form.batchCode} updated successfully.`);
      } else {
        // Create new batch
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "quantity" || name === "unitCost" ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[var(--accent-gold)]" />
          {batch ? "Edit Batch" : "Create New Batch"}
        </div>
      }
      size="md"
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
                onChange={(id) => setForm((prev) => ({ ...prev, meatId: id || 0 }))}
                placeholder="Select meat..."
                activeOnly
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                Supplier
              </label>
              <SupplierSelect
                value={form.supplierId || null}
                onChange={(id) => setForm((prev) => ({ ...prev, supplierId: id || undefined }))}
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
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] text-sm">₱</span>
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
          </div>
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
            onClick={onClose}
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