// src/renderer/pages/inventory/suppliers/hooks/useSuppliers.ts
import { useState, useEffect, useCallback } from "react";
import supplierAPI, {
  type Supplier,
  type SupplierStatistics,
} from "../../../api/core/supplier";

export interface SupplierFilters {
  search: string;
  status: "all" | "active" | "inactive";
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

export interface SupplierSummary {
  totalActive: number;
  totalInactive: number;
  suppliersWithMeats: number;
  totalMeats: number;
}

export const useSuppliers = (initialFilters?: Partial<SupplierFilters>) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [meatCounts, setMeatCounts] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [stats, setStats] = useState<SupplierStatistics | null>(null);
  const [summary, setSummary] = useState<SupplierSummary>({
    totalActive: 0,
    totalInactive: 0,
    suppliersWithMeats: 0,
    totalMeats: 0,
  });
  const [filters, setFilters] = useState<SupplierFilters>({
    search: "",
    status: "all",
    sortBy: "name",
    sortOrder: "ASC",
    ...initialFilters,
  });

  const fetchSuppliers = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const p = options?.page ?? page;
      const l = options?.limit ?? limit;

      setLoading(true);
      setError(null);

      try {
        const isActive =
          filters.status === "all" ? undefined : filters.status === "active";

        const response = await supplierAPI.getAll({
          page: p,
          limit: l,
          search: filters.search || undefined,
          isActive,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        if (response.status) {
          const data = response.data;
          setSuppliers(data.items || []);
          setTotalItems(data.total || 0);
          if (options?.page !== undefined) setPage(p);
          if (options?.limit !== undefined) setLimit(l);
        } else {
          throw new Error(response.message || "Failed to fetch suppliers");
        }

        // Fetch meat counts from statistics
        const statsResponse = await supplierAPI.getStatistics();
        if (statsResponse.status) {
          const statsData = statsResponse.data;
          setStats(statsData);

          const countsMap = new Map<number, number>();
          let totalMeats = 0;
          if (statsData.suppliersWithMeats) {
            statsData.suppliersWithMeats.forEach((item) => {
              countsMap.set(item.id, item.meatCount);
              totalMeats += item.meatCount;
            });
          }
          setMeatCounts(countsMap);
          setSummary({
            totalActive: statsData.totalActive || 0,
            totalInactive: statsData.totalInactive || 0,
            suppliersWithMeats: statsData.suppliersWithMeats?.length || 0,
            totalMeats,
          });
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch suppliers";
        setError(message);
        setSuppliers([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, limit]
  );

  useEffect(() => {
    fetchSuppliers({ page: 1, limit: 10 });
  }, [fetchSuppliers]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchSuppliers(options);
    },
    [fetchSuppliers]
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
    suppliers,
    meatCounts,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    page,
    limit,
    stats,
    summary,
    reload,
    goToPage,
    changeLimit,
    resetFilters,
  };
};