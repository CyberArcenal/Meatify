// src/renderer/pages/inventory/batches/hooks/useBatches.ts
import { useState, useEffect, useCallback } from "react";
import batchAPI, { type Batch, type BatchStatistics } from "../../../api/core/batch";

export interface BatchFilters {
  search: string;
  status: string;
  meatId?: number;
  supplierId?: number;
  expiryDateFrom?: string;
  expiryDateTo?: string;
  minRemaining?: number;
  maxRemaining?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export const useBatches = (initialFilters?: Partial<BatchFilters>) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [stats, setStats] = useState<BatchStatistics | null>(null);
  const [filters, setFilters] = useState<BatchFilters>({
    search: "",
    status: "",
    sortBy: "createdAt",
    sortOrder: "DESC",
    ...initialFilters,
  });

  const fetchBatches = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const p = options?.page ?? page;
      const l = options?.limit ?? limit;

      setLoading(true);
      setError(null);

      try {
        const response = await batchAPI.getAll({
          page: p,
          limit: l,
          search: filters.search || undefined,
          status: filters.status || undefined,
          meatId: filters.meatId,
          supplierId: filters.supplierId,
          expiryDateFrom: filters.expiryDateFrom,
          expiryDateTo: filters.expiryDateTo,
          minRemaining: filters.minRemaining,
          maxRemaining: filters.maxRemaining,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        if (response.status) {
          const data = response.data;
          setBatches(data.items || []);
          setTotalItems(data.total || 0);
          if (options?.page !== undefined) setPage(p);
          if (options?.limit !== undefined) setLimit(l);
        } else {
          throw new Error(response.message || "Failed to fetch batches");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch batches";
        setError(message);
        setBatches([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, limit]
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await batchAPI.getStatistics();
      if (response.status) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch batch stats:", err);
    }
  }, []);

  // Auto-fetch when filters change
  useEffect(() => {
    fetchBatches({ page: 1, limit });
  }, [filters]);

  // Re-fetch when page/limit change
  useEffect(() => {
    fetchBatches({ page, limit });
  }, [page, limit]);

  // Initial stats fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchBatches(options);
      fetchStats();
    },
    [fetchBatches, fetchStats]
  );

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1) setPage(newPage);
  }, []);

  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: "",
      status: "",
      meatId: undefined,
      supplierId: undefined,
      expiryDateFrom: undefined,
      expiryDateTo: undefined,
      minRemaining: undefined,
      maxRemaining: undefined,
      sortBy: "createdAt",
      sortOrder: "DESC",
    });
    setPage(1);
  }, []);

  return {
    batches,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    page,
    limit,
    stats,
    reload,
    fetchStats,
    goToPage,
    changeLimit,
    resetFilters,
  };
};