// src/renderer/pages/analytics/returns/hooks/useReturnRefunds.ts
import { useState, useEffect, useCallback } from "react";
import type { ReturnRefund, ReturnStatistics } from "../../../../api/core/returnRefund";
import returnRefundAPI from "../../../../api/core/returnRefund";


export interface ReturnFilters {
  search: string;
  status: string;
  refundMethod: string;
  startDate?: string;
  endDate?: string;
  customerId?: number;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

export interface ReturnSummary {
  totalCount: number;
  totalAmount: number;
  processedCount: number;
  pendingCount: number;
  cancelledCount: number;
  avgAmount: number;
}

export const useReturnRefunds = (initialFilters?: Partial<ReturnFilters>) => {
  const [returns, setReturns] = useState<ReturnRefund[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState<ReturnSummary | null>(null);
  const [stats, setStats] = useState<ReturnStatistics | null>(null);
  const [filters, setFilters] = useState<ReturnFilters>({
    search: "",
    status: "",
    refundMethod: "",
    startDate: undefined,
    endDate: undefined,
    customerId: undefined,
    sortBy: "createdAt",
    sortOrder: "DESC",
    ...initialFilters,
  });

  const fetchReturns = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const page = options?.page || 1;
      const limit = options?.limit || 10;

      setLoading(true);
      setError(null);

      try {
        const response = await returnRefundAPI.getAll({
          page,
          limit,
          status: filters.status || undefined,
          refundMethod: filters.refundMethod || undefined,
          customerId: filters.customerId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          search: filters.search || undefined,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        if (response.status) {
          const data = response.data;
          setReturns(data.items || []);
          setTotalItems(data.total || 0);
        } else {
          throw new Error(response.message || "Failed to fetch returns");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch returns";
        setError(message);
        setReturns([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const fetchSummary = useCallback(async () => {
    try {
      const statsResponse = await returnRefundAPI.getStatistics();
      if (statsResponse.status) {
        const statsData = statsResponse.data;
        setStats(statsData);

        // Compute summary from stats
        const statusCounts = statsData.statusCounts || [];
        const pending = statusCounts.find((s) => s.status === "pending")?.count || 0;
        const processed = statusCounts.find((s) => s.status === "processed")?.count || 0;
        const cancelled = statusCounts.find((s) => s.status === "cancelled")?.count || 0;
        const totalCount = pending + processed + cancelled;
        const totalAmount = statusCounts.reduce((sum, s) => sum + (s.total || 0), 0);

        setSummary({
          totalCount,
          totalAmount,
          processedCount: processed,
          pendingCount: pending,
          cancelledCount: cancelled,
          avgAmount: totalCount > 0 ? totalAmount / totalCount : 0,
        });
      }
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
  }, []);

  useEffect(() => {
    fetchReturns({ page: 1, limit: 10 });
    fetchSummary();
  }, [fetchReturns, fetchSummary]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchReturns(options);
      fetchSummary();
    },
    [fetchReturns, fetchSummary]
  );

  return {
    returns,
    loading,
    error,
    totalItems,
    filters,
    setFilters,
    reload,
    summary,
    stats,
  };
};