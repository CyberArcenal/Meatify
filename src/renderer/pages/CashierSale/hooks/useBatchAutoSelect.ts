// src/renderer/pages/Cashier/hooks/useBatchAutoSelect.ts
import { useCallback } from "react";
import batchAPI from "../../../api/core/batch";
import type { Batch } from "../../../api/core/batch";

export const useBatchAutoSelect = () => {
  const getBestBatch = useCallback(async (meatId: number): Promise<Batch | null> => {
    try {
      const response = await batchAPI.getActiveBatches(meatId);
      if (!response.status || !response.data.items.length) {
        return null;
      }
      // Sort by expiry date (earliest first) then by remaining quantity (highest first)
      const sorted = [...response.data.items].sort((a, b) => {
        const dateA = new Date(a.expiryDate);
        const dateB = new Date(b.expiryDate);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
        return b.remainingQuantity - a.remainingQuantity;
      });
      return sorted[0];
    } catch (error) {
      console.error("Failed to get best batch:", error);
      return null;
    }
  }, []);

  return { getBestBatch };
};