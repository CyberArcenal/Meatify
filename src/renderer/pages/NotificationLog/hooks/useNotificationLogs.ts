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
  const [stats, setStats] = useState<LogStatistics | null>(null);
  const [filters, setFilters] = useState<NotificationFilters>({
    sortBy: "created_at",
    sortOrder: "DESC",
    ...initialFilters,
  });

  const fetchLogs = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const page = options?.page || 1;
      const limit = options?.limit || 10;

      setLoading(true);
      setError(null);

      try {
        let response;
        if (filters.keyword) {
          response = await notificationLogAPI.search({
            keyword: filters.keyword,
            page,
            limit,
          });
        } else {
          response = await notificationLogAPI.getAll({
            page,
            limit,
            status: filters.status,
            startDate: filters.startDate,
            endDate: filters.endDate,
            sortBy: filters.sortBy || "created_at",
            sortOrder: filters.sortOrder || "DESC",
          });
        }

        console.log("API Response:", response);

        if (response.status) {
          // ✅ Extract items from nested structure
          const items = response.data?.data || [];
          const total = response.data?.pagination?.total || 0;
          
          setLogs(items);
          setTotalItems(total);
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
    [filters]
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await notificationLogAPI.getStatistics();
      if (response.status) {
        // ✅ Check if stats are nested similarly
        const statsData = response.data?.data || response.data;
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  }, []);

  useEffect(() => {
    fetchLogs({ page: 1, limit: 10 });
    fetchStats();
  }, [fetchLogs, fetchStats]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchLogs(options);
    },
    [fetchLogs]
  );

  return {
    logs,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    stats,
    reload,
  };
};