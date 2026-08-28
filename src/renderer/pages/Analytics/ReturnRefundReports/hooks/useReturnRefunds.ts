// src/renderer/pages/analytics/returns/hooks/useReturnRefunds.ts
import { useState, useEffect, useCallback } from "react";
import type { ReturnRefundReport, ReturnSummaryData } from "../../../../api/analytics/returnRefundReports";
import returnRefundReportsAPI from "../../../../api/analytics/returnRefundReports";

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

export interface ReturnStats {
  statusCounts: Array<{ status: string; count: number; total: number }>;
  topCustomers: Array<{ customerId: number; customerName: string; count: number; totalAmount: number }>;
  totalProcessedAmount: number;
  averageProcessedAmount: number;
}

export const useReturnRefunds = (initialFilters?: Partial<ReturnFilters>) => {
  const [returns, setReturns] = useState<ReturnRefundReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState<ReturnSummary | null>(null);
  const [stats, setStats] = useState<ReturnStats | null>(null);
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
        const response = await returnRefundReportsAPI.getData({
          page,
          limit,
          status: filters.status || undefined,
          refundMethod: filters.refundMethod || undefined,
          customerId: filters.customerId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          // Note: search is not directly supported by getData; we can filter client-side if needed.
          // Alternatively, we could add a search param in the backend, but for now we pass undefined.
        });

        if (response.status) {
          const data = response.data;
          setReturns(data.returns || []);
          setTotalItems(data.pagination.total || 0);
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

  const fetchSummaryAndStats = useCallback(async () => {
    try {
      const summaryResponse = await returnRefundReportsAPI.getSummary({
        period: "month", // You may want to make this dynamic based on filters
        status: filters.status || undefined,
      });

      if (summaryResponse.status) {
        const data = summaryResponse.data as ReturnSummaryData;
        const summaryData = data.summary;

        // Compute summary fields
        const statusBreakdown = summaryData.statusBreakdown || {};
        const processedCount = statusBreakdown.processed || 0;
        const pendingCount = statusBreakdown.pending || 0;
        const cancelledCount = statusBreakdown.cancelled || 0;

        setSummary({
          totalCount: summaryData.totalReturns,
          totalAmount: summaryData.totalReturnsAmount,
          processedCount,
          pendingCount,
          cancelledCount,
          avgAmount: summaryData.avgRefund,
        });

        // Compute stats fields
        const statusCounts = Object.entries(statusBreakdown).map(([status, count]) => ({
          status,
          count: count as number,
          total: status === "processed" ? summaryData.totalReturnsAmount : 0, // approximate
        }));

        const processedAmount = statusBreakdown.processed ? summaryData.totalReturnsAmount * (processedCount / summaryData.totalReturns) : 0;

        setStats({
          statusCounts,
          topCustomers: summaryData.topCustomers || [],
          totalProcessedAmount: processedAmount,
          averageProcessedAmount: summaryData.avgRefund,
        });
      }
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
  }, [filters.status]);

  useEffect(() => {
    fetchReturns({ page: 1, limit: 10 });
    fetchSummaryAndStats();
  }, [fetchReturns, fetchSummaryAndStats]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchReturns(options);
      fetchSummaryAndStats();
    },
    [fetchReturns, fetchSummaryAndStats]
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