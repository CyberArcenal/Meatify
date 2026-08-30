// src/renderer/pages/inventory/batches/hooks/useBatchForm.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import type { Batch } from "../../../api/core/batch";
import meatAPI from "../../../api/core/meat";

export interface BatchFormData {
  meatId: number;
  quantity: number;
  unitCost: number;
  expiryDate: string;
  supplierId?: number;
  note: string;
  batchCode: string;
}

export const useBatchForm = (batch: Batch | null) => {
  const [form, setForm] = useState<BatchFormData>({
    meatId: 0,
    quantity: 0,
    unitCost: 0,
    expiryDate: "",
    supplierId: undefined,
    note: "",
    batchCode: "",
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize form when batch changes (editing mode)
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
  }, [batch]);

  // Auto-set unitCost when meat changes (only for new batch)
  useEffect(() => {
    if (batch) return;
    if (!form.meatId || form.meatId === 0) return;

    let isMounted = true;

    meatAPI
      .getById(form.meatId)
      .then((res) => {
        if (isMounted && res.status && res.data) {
          setForm((prev) => ({
            ...prev,
            unitCost: res.data.pricePerKg,
          }));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch meat price:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [form.meatId, batch]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "quantity" || name === "unitCost"
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleMeatChange = (id: number | null) => {
    setForm((prev) => ({ ...prev, meatId: id || 0 }));
  };

  const handleSupplierChange = (id: number | null) => {
    setForm((prev) => ({ ...prev, supplierId: id || undefined }));
  };

  const resetForm = useCallback(() => {
    setForm({
      meatId: 0,
      quantity: 0,
      unitCost: 0,
      expiryDate: "",
      supplierId: undefined,
      note: "",
      batchCode: "",
    });
    setError(null);
  }, []);

  // ✅ Auto-calculate total cost whenever quantity or unitCost changes
  const totalCost = useMemo(() => {
    return form.quantity * form.unitCost;
  }, [form.quantity, form.unitCost]);

  return {
    form,
    error,
    setError,
    totalCost,
    handleChange,
    handleMeatChange,
    handleSupplierChange,
    resetForm,
  };
};