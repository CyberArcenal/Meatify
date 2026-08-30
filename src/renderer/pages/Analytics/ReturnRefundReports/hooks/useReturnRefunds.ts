// src/renderer/pages/analytics/returns/hooks/useReturnRefunds.ts
import { useState, useEffect, useCallback, useRef } from "react";
import type {
  ReturnRefundReport,
  ReturnSummaryData,
} from "../../../../api/analytics/returnRefundReports";
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
  topCustomers: Array<{
    customerId: number;
    customerName: string;
    count: number;
    totalAmount: number;
  }>;
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

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

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchReturns = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const p = options?.page ?? page;
      const l = options?.limit ?? limit;

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      // Build params conditionally
      const params: any = {
        page: p,
        limit: l,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      if (filters.status) params.status = filters.status;
      if (filters.refundMethod) params.refundMethod = filters.refundMethod;
      if (filters.customerId !== undefined && filters.customerId !== null) {
        params.customerId = filters.customerId;
      }
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      try {
        const response = await returnRefundReportsAPI.getData(params);
        if (!controller.signal.aborted) {
          if (response.status) {
            const data = response.data;
            setReturns(data.returns || []);
            setTotalItems(data.pagination?.total || 0);
            setPage(p);
            setLimit(l);
          } else {
            throw new Error(response.message || "Failed to fetch returns");
          }
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          const message = err instanceof Error ? err.message : "Failed to fetch returns";
          setError(message);
          setReturns([]);
          setTotalItems(0);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [filters, page, limit]
  );

  const fetchSummaryAndStats = useCallback(async () => {
    try {
      const summaryResponse = await returnRefundReportsAPI.getSummary({
        period: "month",
        status: filters.status || undefined,
      });

      if (summaryResponse.status) {
        const data = summaryResponse.data as ReturnSummaryData;
        const summaryData = data.summary;

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

        const statusCounts = Object.entries(statusBreakdown).map(([status, count]) => ({
          status,
          count: count as number,
          total: status === "processed" ? summaryData.totalReturnsAmount : 0,
        }));

        const processedAmount =
          statusBreakdown.processed && summaryData.totalReturns > 0
            ? summaryData.totalReturnsAmount * (processedCount / summaryData.totalReturns)
            : 0;

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
    fetchReturns({ page: 1, limit });
    fetchSummaryAndStats();
    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchReturns({ page: 1, limit });
    fetchSummaryAndStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, fetchSummaryAndStats]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchReturns(options);
      fetchSummaryAndStats();
    },
    [fetchReturns, fetchSummaryAndStats]
  );

  const updateFilters = useCallback((newFilters: Partial<ReturnFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  return {
    returns,
    loading,
    error,
    totalItems,
    filters,
    setFilters: updateFilters,
    reload,
    summary,
    stats,
    page,
    limit,
  };
};