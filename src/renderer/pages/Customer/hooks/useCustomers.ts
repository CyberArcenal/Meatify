// src/renderer/pages/customer/hooks/useCustomers.ts
import { useState, useEffect, useCallback } from "react";
import customerAPI, { type Customer, type CustomerStatistics } from "../../../api/core/customer";

export interface CustomerFilters {
  search: string;
  status: "all" | "vip" | "elite" | "regular";
  sortBy: "name" | "points" | "createdAt";
  sortOrder: "ASC" | "DESC";
  minPoints?: number;
  maxPoints?: number;
}

export interface CustomerMetrics {
  total: number;
  vipCount: number;
  eliteCount: number;
  regularCount: number;
  newThisMonth: number;
}

const SORT_FIELD_MAP: Record<CustomerFilters["sortBy"], string> = {
  name: "name",
  points: "loyaltyPointsBalance",
  createdAt: "createdAt",
};

export const useCustomers = (initialFilters?: Partial<CustomerFilters>) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filters, setFilters] = useState<CustomerFilters>({
    search: "",
    status: "all",
    sortBy: "name",
    sortOrder: "ASC",
    minPoints: undefined,
    maxPoints: undefined,
    ...initialFilters,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [stats, setStats] = useState<CustomerStatistics | null>(null);
  const [metrics, setMetrics] = useState<CustomerMetrics>({
    total: 0,
    vipCount: 0,
    eliteCount: 0,
    regularCount: 0,
    newThisMonth: 0,
  });

  const fetchCustomers = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const p = options?.page ?? page;
      const l = options?.limit ?? limit;

      setLoading(true);
      setError(null);

      try {
        const params: any = {
          page: p,
          limit: l,
          searchTerm: filters.search || undefined,
          minPoints: filters.minPoints,
          maxPoints: filters.maxPoints,
          sortBy: SORT_FIELD_MAP[filters.sortBy],
          sortOrder: filters.sortOrder,
        };

        if (filters.status !== "all") {
          params.status = filters.status;
        }

        const response = await customerAPI.search(params);
        if (response.status) {
          const data = response.data;
          setCustomers(data.items || []);
          setTotalItems(data.total || 0);
          if (options?.page !== undefined) setPage(p);
          if (options?.limit !== undefined) setLimit(l);

          // Compute metrics
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const items = data.items || [];
          setMetrics({
            total: data.total || 0,
            vipCount: items.filter((c) => c.status === "vip").length,
            eliteCount: items.filter((c) => c.status === "elite").length,
            regularCount: items.filter((c) => c.status === "regular").length,
            newThisMonth: items.filter(
              (c) => new Date(c.createdAt) >= firstDayOfMonth
            ).length,
          });
        } else {
          throw new Error(response.message);
        }
      } catch (err: any) {
        setError(err.message);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, limit]
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await customerAPI.getStatistics();
      if (response.status) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch customer stats:", err);
    }
  }, []);

  // Auto-fetch when filters change
  useEffect(() => {
    fetchCustomers({ page: 1, limit });
  }, [filters]);

  // Re-fetch when page/limit change
  useEffect(() => {
    fetchCustomers({ page, limit });
  }, [page, limit]);

  // Initial stats fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchCustomers(options);
      fetchStats();
    },
    [fetchCustomers, fetchStats]
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
      status: "all",
      sortBy: "name",
      sortOrder: "ASC",
      minPoints: undefined,
      maxPoints: undefined,
    });
    setPage(1);
  }, []);

  return {
    customers,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    page,
    limit,
    stats,
    metrics,
    reload,
    fetchStats,
    goToPage,
    changeLimit,
    resetFilters,
  };
};