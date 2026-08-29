// src/renderer/pages/inventory/meat/hooks/useMeat.ts
import { useState, useEffect, useCallback } from "react";
import meatAPI, { type Meat } from "../../../api/core/meat";
import categoryAPI, { type Category } from "../../../api/core/category";
import supplierAPI, { type Supplier } from "../../../api/core/supplier";

export interface MeatFilters {
  search: string;
  status: "all" | "active" | "inactive";
  categoryId?: number;
  supplierId?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface MeatStats {
  totalActive: number;
  totalInactive: number;
  averagePricePerKg: number;
  byCategory: Array<{ categoryId: number; categoryName: string; count: number }>;
}

export const useMeat = (initialFilters?: Partial<MeatFilters>) => {
  const [meats, setMeats] = useState<Meat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<MeatStats | null>(null);
  const [filters, setFilters] = useState<MeatFilters>({
    search: "",
    status: "all",
    sortBy: "name",
    sortOrder: "ASC",
    ...initialFilters,
  });

  const fetchMeats = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const p = options?.page ?? page;
      const l = options?.limit ?? limit;

      setLoading(true);
      setError(null);

      try {
        const isActive =
          filters.status === "all" ? undefined : filters.status === "active";

        const response = await meatAPI.getAll({
          page: p,
          limit: l,
          search: filters.search || undefined,
          isActive,
          categoryId: filters.categoryId,
          supplierId: filters.supplierId,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        if (response.status) {
          const data = response.data;
          setMeats(data.items || []);
          setTotalItems(data.total || 0);
          // Update page and limit only if they were provided or if they changed
          if (options?.page !== undefined) setPage(p);
          if (options?.limit !== undefined) setLimit(l);
        } else {
          throw new Error(response.message || "Failed to fetch meats");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch meats";
        setError(message);
        setMeats([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, limit]
  );

  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoryAPI.getActive();
      if (response.status) {
        setCategories(response.data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await supplierAPI.getActive();
      if (response.status) {
        setSuppliers(response.data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await meatAPI.getStatistics();
      if (response.status) {
        const data = response.data;
        setStats({
          totalActive: data.totalActive || 0,
          totalInactive: data.totalInactive || 0,
          averagePricePerKg: data.averagePricePerKg || 0,
          byCategory: data.byCategory || [],
        });
      }
    } catch (err) {
      console.error("Failed to fetch meat stats:", err);
    }
  }, []);

  // Automatically fetch when filters or page/limit change
  useEffect(() => {
    fetchMeats({ page, limit });
  }, [filters, page, limit, fetchMeats]); // fetchMeats depends on filters, page, limit

  // Initial load of categories and suppliers
  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, [fetchCategories, fetchSuppliers]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchMeats(options);
    },
    [fetchMeats]
  );

  // Setters that also trigger refetch
  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1) {
      setPage(newPage);
    }
  }, []);

  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // reset to first page when limit changes
  }, []);

  return {
    meats,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    page,
    limit,
    categories,
    suppliers,
    stats,
    reload,
    fetchStats,
    goToPage,
    changeLimit,
  };
};