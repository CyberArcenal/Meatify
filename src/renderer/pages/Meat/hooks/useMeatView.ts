// src/renderer/pages/inventory/meat/hooks/useMeatView.ts
import { useState } from "react";
import type { Meat } from "../../../api/core/meat";
import type { Batch } from "../../../api/core/batch";
import batchAPI from "../../../api/core/batch";

export const useMeatView = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [meat, setMeat] = useState<Meat | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);

  const open = async (meat: Meat) => {
    setMeat(meat);
    setIsOpen(true);
    setLoading(true);

    try {
      // Fetch batches for this meat
      const response = await batchAPI.getByMeat(meat.id);
      if (response.status) {
        setBatches(response.data.items || []);
      }
    } catch (err) {
      console.error("Failed to load batches:", err);
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    setMeat(null);
    setBatches([]);
  };

  return {
    isOpen,
    meat,
    batches,
    loading,
    open,
    close,
  };
};