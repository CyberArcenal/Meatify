// src/renderer/pages/AuditTrail/hooks/useAuditLogs.ts
import { useState, useEffect, useCallback } from "react";
import type { AuditLogEntry } from "../../../api/core/audit";
import auditAPI from "../../../api/core/audit";
import { getActionColor } from "../utils/auditColors";

export interface AuditFilters {
  action: "all" | string;
  startDate?: string;
  endDate?: string;
  search: string;
  entity?: string;
  user?: string;
}

export interface AuditSummary {
  totalToday: number;
  byAction: Record<string, number>;
  mostActiveUser: { user: string; count: number } | null;
  mostAffectedEntity: { entity: string; count: number } | null;
}

export { getActionColor };

export const useAuditLogs = (initialFilters?: Partial<AuditFilters>) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filters, setFilters] = useState<AuditFilters>({
    action: "all",
    startDate: undefined,
    endDate: undefined,
    search: "",
    entity: undefined,
    user: undefined,
    ...initialFilters,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [summary, setSummary] = useState<AuditSummary>({
    totalToday: 0,
    byAction: {},
    mostActiveUser: null,
    mostAffectedEntity: null,
  });

  const fetchLogs = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const p = options?.page ?? page;
      const l = options?.limit ?? limit;

      setLoading(true);
      setError(null);

      try {
        const params: any = {
          page: p,
          limit: l,
          action: filters.action === "all" ? undefined : filters.action,
          startDate: filters.startDate,
          endDate: filters.endDate,
          user: filters.user,
          entity: filters.entity,
          searchTerm: filters.search || undefined,
        };

        const response = await auditAPI.search(params);
        if (!response.status) throw new Error(response.message);

        const items = response.data.items || [];
        const total = response.data.total || 0;
        setLogs(items);
        setTotalItems(total);
        if (options?.page !== undefined) setPage(p);
        if (options?.limit !== undefined) setLimit(l);

        // Compute summary
        const today = new Date().toISOString().split("T")[0];
        const todayLogs = items.filter((log) => {
          const logDate =
            typeof log.timestamp === "string"
              ? log.timestamp
              : new Date(log.timestamp).toISOString();
          return logDate.startsWith(today);
        });

        const byAction: Record<string, number> = {};
        const userCounts: Record<string, number> = {};
        const entityCounts: Record<string, number> = {};

        items.forEach((log) => {
          const action = log.action || "Unknown";
          byAction[action] = (byAction[action] || 0) + 1;

          const userName = log.user || "System";
          userCounts[userName] = (userCounts[userName] || 0) + 1;

          if (log.entity) {
            entityCounts[log.entity] = (entityCounts[log.entity] || 0) + 1;
          }
        });

        let mostActiveUser = null;
        let maxUserCount = 0;
        Object.entries(userCounts).forEach(([user, count]) => {
          if (count > maxUserCount) {
            maxUserCount = count;
            mostActiveUser = { user, count };
          }
        });

        let mostAffectedEntity = null;
        let maxEntityCount = 0;
        Object.entries(entityCounts).forEach(([entity, count]) => {
          if (count > maxEntityCount) {
            maxEntityCount = count;
            mostAffectedEntity = { entity, count };
          }
        });

        setSummary({
          totalToday: todayLogs.length,
          byAction,
          mostActiveUser,
          mostAffectedEntity,
        });
      } catch (err: any) {
        setError(err.message);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, limit]
  );

  // Auto-fetch when filters change
  useEffect(() => {
    fetchLogs({ page: 1, limit });
  }, [filters]);

  // Re-fetch when page/limit change
  useEffect(() => {
    fetchLogs({ page, limit });
  }, [page, limit]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchLogs(options);
    },
    [fetchLogs]
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
      action: "all",
      startDate: undefined,
      endDate: undefined,
      search: "",
      entity: undefined,
      user: undefined,
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
    summary,
    reload,
    fetchLogs,
    goToPage,
    changeLimit,
    resetFilters,
  };
};