// src/renderer/pages/Cashier/hooks/useBatchCache.ts
import { useCallback } from "react";
import type { Batch } from "../../../api/core/batch";

const STORAGE_KEY = "cashier_batch_cache";

interface CacheEntry {
  meatId: number;
  batchId: number;
  batchCode: string;
}

export const useBatchCache = () => {
  const getCache = useCallback((): CacheEntry[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const setCache = useCallback((entries: CacheEntry[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // ignore
    }
  }, []);

  const getBatchForMeat = useCallback(
    (meatId: number): { batchId: number; batchCode: string } | null => {
      const cache = getCache();
      const entry = cache.find((e) => e.meatId === meatId);
      return entry ? { batchId: entry.batchId, batchCode: entry.batchCode } : null;
    },
    [getCache]
  );

  const setBatchForMeat = useCallback(
    (meatId: number, batchId: number, batchCode: string) => {
      const cache = getCache();
      const existing = cache.findIndex((e) => e.meatId === meatId);
      if (existing !== -1) {
        cache[existing] = { meatId, batchId, batchCode };
      } else {
        cache.push({ meatId, batchId, batchCode });
      }
      setCache(cache);
    },
    [getCache, setCache]
  );

  const clearBatchForMeat = useCallback(
    (meatId: number) => {
      const cache = getCache();
      const filtered = cache.filter((e) => e.meatId !== meatId);
      setCache(filtered);
    },
    [getCache, setCache]
  );

  return {
    getBatchForMeat,
    setBatchForMeat,
    clearBatchForMeat,
  };
};