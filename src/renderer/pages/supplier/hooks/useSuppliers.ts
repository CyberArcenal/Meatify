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

export const useSuppliers = (initialFilters?: Partial<SupplierFilters>) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [meatCounts, setMeatCounts] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState<SupplierFilters>({
    search: "",
    status: "all",
    sortBy: "name",
    sortOrder: "ASC",
    ...initialFilters,
  });

  const fetchSuppliers = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const page = options?.page || 1;
      const limit = options?.limit || 10;

      setLoading(true);
      setError(null);

      try {
        const isActive =
          filters.status === "all" ? undefined : filters.status === "active";

        const response = await supplierAPI.getAll({
          page,
          limit,
          search: filters.search || undefined,
          isActive,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        if (response.status) {
          const data = response.data;
          setSuppliers(data.items || []);
          setTotalItems(data.total || 0);
        } else {
          throw new Error(response.message || "Failed to fetch suppliers");
        }

        // Fetch meat counts from statistics
        const statsResponse = await supplierAPI.getStatistics();
        if (statsResponse.status) {
          const stats = statsResponse.data;
          const countsMap = new Map<number, number>();
          if (stats.suppliersWithMeats) {
            stats.suppliersWithMeats.forEach((item) => {
              countsMap.set(item.id, item.meatCount);
            });
          }
          setMeatCounts(countsMap);
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
    [filters]
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

  return {
    suppliers,
    meatCounts,
    loading,
    error,
    totalItems,
    filters,
    setFilters,
    reload,
  };
};