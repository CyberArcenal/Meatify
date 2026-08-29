// src/renderer/pages/Cashier/hooks/useBatchSelection.ts
import { useState, useEffect, useCallback } from "react";
import type { Batch } from "../../../api/core/batch";
import batchAPI from "../../../api/core/batch";

const STORAGE_KEY = "cashier_selected_batch";

export const useBatchSelection = () => {
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.id) {
          fetchBatch(parsed.id);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const fetchBatch = useCallback(async (batchId: number) => {
    setLoading(true);
    try {
      const response = await batchAPI.getById(batchId);
      if (response.status && response.data) {
        setSelectedBatch(response.data);
      } else {
        setSelectedBatch(null);
      }
    } catch {
      setSelectedBatch(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectBatch = useCallback((batch: Batch | null) => {
    setSelectedBatch(batch);
    if (batch) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: batch.id, code: batch.batchCode }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return { selectedBatch, selectBatch, loading };
};