// src/renderer/pages/system/notification-logs/hooks/useNotificationLogs.ts
import { useState, useEffect, useCallback } from "react";
import notificationLogAPI from "../../../api/core/notificationLog";
import type {
  NotificationLog,
  LogStatistics,
} from "../../../api/core/notificationLog";

export interface NotificationFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export const useNotificationLogs = (initialFilters?: Partial<NotificationFilters>) => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [stats, setStats] = useState<LogStatistics | null>(null);
  const [filters, setFilters] = useState<NotificationFilters>({
    sortBy: "created_at",
    sortOrder: "DESC",
    ...initialFilters,
  });

  const fetchLogs = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const p = options?.page ?? page;
      const l = options?.limit ?? limit;

      setLoading(true);
      setError(null);

      try {
        let response;
        if (filters.keyword) {
          response = await notificationLogAPI.search({
            keyword: filters.keyword,
            page: p,
            limit: l,
          });
        } else {
          response = await notificationLogAPI.getAll({
            page: p,
            limit: l,
            status: filters.status,
            startDate: filters.startDate,
            endDate: filters.endDate,
            sortBy: filters.sortBy || "created_at",
            sortOrder: filters.sortOrder || "DESC",
          });
        }

        if (response.status) {
          const items = response.data?.items || [];
          const total = response.data?.total || 0;
          setLogs(items);
          setTotalItems(total);
          if (options?.page !== undefined) setPage(p);
          if (options?.limit !== undefined) setLimit(l);
        } else {
          throw new Error(response.message);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch notification logs");
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, limit]
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await notificationLogAPI.getStatistics();
      if (response.status) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  }, []);

  // Auto-fetch when filters change
  useEffect(() => {
    fetchLogs({ page: 1, limit });
  }, [filters]);

  // Re-fetch when page/limit change
  useEffect(() => {
    fetchLogs({ page, limit });
  }, [page, limit]);

  // Initial stats fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchLogs(options);
      fetchStats();
    },
    [fetchLogs, fetchStats]
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
      status: undefined,
      startDate: undefined,
      endDate: undefined,
      keyword: undefined,
      sortBy: "created_at",
      sortOrder: "DESC",
    });
    setPage(1);
  }, []);

  return {
    logs,
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