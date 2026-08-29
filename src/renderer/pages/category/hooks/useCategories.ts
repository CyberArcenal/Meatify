// src/renderer/pages/category/hooks/useCategories.ts
import { useState, useEffect, useCallback } from "react";
import categoryAPI, { type Category } from "../../../api/core/category";

export interface CategoryFilters {
  search: string;
  status: "all" | "active" | "inactive";
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

export interface CategoryStats {
  totalActive: number;
  totalInactive: number;
  totalMeats: number;
  categoriesWithMeats: Array<{
    id: number;
    name: string;
    meatCount: number;
  }>;
}

export const useCategories = (initialFilters?: Partial<CategoryFilters>) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [filters, setFilters] = useState<CategoryFilters>({
    search: "",
    status: "all",
    sortBy: "name",
    sortOrder: "ASC",
    ...initialFilters,
  });

  const fetchCategories = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const p = options?.page ?? page;
      const l = options?.limit ?? limit;

      setLoading(true);
      setError(null);

      try {
        const isActive = filters.status === "all" ? undefined : filters.status === "active";

        const response = await categoryAPI.getAll({
          page: p,
          limit: l,
          search: filters.search || undefined,
          isActive,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        if (response.status) {
          const data = response.data;
          setCategories(data?.items || []);
          setTotalItems(data?.total || 0);
          if (options?.page !== undefined) setPage(p);
          if (options?.limit !== undefined) setLimit(l);
        } else {
          throw new Error(response.message || "Failed to fetch categories");
        }

        // Get product counts from statistics
        const statsResponse = await categoryAPI.getStatistics();
        if (statsResponse.status) {
          const countsMap = new Map<number, number>();
          const statsData = statsResponse.data;
          if (statsData && statsData.categoriesWithMeats) {
            statsData.categoriesWithMeats.forEach((item) => {
              countsMap.set(item.id, item.meatCount);
            });
          }
          setProductCounts(countsMap);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch categories";
        setError(message);
        setCategories([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, limit]
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await categoryAPI.getStatistics();
      if (response.status) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch category stats:", err);
    }
  }, []);

  // Auto-fetch when filters change
  useEffect(() => {
    fetchCategories({ page: 1, limit });
  }, [filters]);

  // Re-fetch when page/limit change
  useEffect(() => {
    fetchCategories({ page, limit });
  }, [page, limit]);

  // Initial stats fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchCategories(options);
      fetchStats();
    },
    [fetchCategories, fetchStats]
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
    });
    setPage(1);
  }, []);

  return {
    categories,
    productCounts,
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