import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Batch } from '../../../api/core/batch';
import batchAPI from '../../../api/core/batch';

interface Props {
  batch: Batch | null; // null for create
  onClose: () => void;
  onSuccess: () => void;
}

const BatchFormDialog: React.FC<Props> = ({ batch, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    meatId: 0,
    quantity: 0,
    unitCost: 0,
    expiryDate: '',
    supplierId: undefined as number | undefined,
    note: '',
    batchCode: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (batch) {
      setForm({
        meatId: batch.meatId,
        quantity: batch.initialQuantity, // for edit, quantity might not be editable? We'll allow initial only
        unitCost: batch.unitCost,
        expiryDate: batch.expiryDate,
        supplierId: batch.supplierId || undefined,
        note: batch.note || '',
        batchCode: batch.batchCode,
      });
    }
  }, [batch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (batch) {
        // Update existing batch
        const res = await batchAPI.update(batch.id, {
          batchCode: form.batchCode,
          unitCost: form.unitCost,
          expiryDate: form.expiryDate,
          note: form.note,
        });
        if (!res.status) throw new Error(res.message);
      } else {
        // Create new batch
        const res = await batchAPI.create({
          meatId: form.meatId,
          quantity: form.quantity,
          unitCost: form.unitCost,
          expiryDate: form.expiryDate,
          supplierId: form.supplierId,
          note: form.note,
          batchCode: form.batchCode || undefined,
        });
        if (!res.status) throw new Error(res.message);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'supplierId' ? (value ? Number(value) : undefined) : value,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {batch ? 'Edit Batch' : 'Create New Batch'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)]">
              <X className="w-5 h-5 text-[var(--text-tertiary)]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-[var(--danger-bg)] text-[var(--danger-color)] p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {!batch && (
              <>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">Meat ID</label>
                  <input
                    type="number"
                    name="meatId"
                    value={form.meatId || ''}
                    onChange={handleChange}
                    required
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-focus)]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">Initial Quantity (kg)</label>
                  <input
                    type="number"
                    name="quantity"
                    value={form.quantity || ''}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-focus)]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">Supplier ID</label>
                  <input
                    type="number"
                    name="supplierId"
                    value={form.supplierId || ''}
                    onChange={handleChange}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-focus)]"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Batch Code</label>
              <input
                type="text"
                name="batchCode"
                value={form.batchCode}
                onChange={handleChange}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-focus)]"
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Unit Cost</label>
              <input
                type="number"
                name="unitCost"
                value={form.unitCost || ''}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-focus)]"
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Expiry Date</label>
              <input
                type="date"
                name="expiryDate"
                value={form.expiryDate}
                onChange={handleChange}
                required
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-focus)]"
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Note</label>
              <textarea
                name="note"
                value={form.note}
                onChange={handleChange}
                rows={3}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-focus)]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue-hover)] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : batch ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BatchFormDialog;