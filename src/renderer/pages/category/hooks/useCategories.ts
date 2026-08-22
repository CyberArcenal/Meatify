// src/renderer/pages/category/hooks/useCategories.ts
import { useState, useEffect, useCallback } from "react";
import categoryAPI, { type Category } from "../../../api/core/category";

export interface CategoryFilters {
  search: string;
  status: "all" | "active" | "inactive";
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

export function useCategories(initialFilters?: Partial<CategoryFilters>) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Map<number, number>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState<CategoryFilters>({
    search: "",
    status: "all",
    sortBy: "name",
    sortOrder: "ASC",
    ...initialFilters,
  });

  const fetchCategories = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const page = options?.page || 1;
      const limit = options?.limit || 10;

      setLoading(true);
      setError(null);
      try {
        const isActive =
          filters.status === "all" ? undefined : filters.status === "active";

        // ✅ Get paginated categories
        const response = await categoryAPI.getAll({
          page,
          limit,
          search: filters.search || undefined,
          isActive,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        if (response.status) {
          const data = response.data;
          const items = data?.items || [];
          const total = data?.total || 0;

          setCategories(items);
          setTotalItems(total);
        } else {
          throw new Error(response.message || "Failed to fetch categories");
        }

        // ✅ Get product counts from statistics
        const statsResponse = await categoryAPI.getStatistics();
        if (statsResponse.status) {
          const countsMap = new Map<number, number>();
          const stats = statsResponse.data;
          
          // ✅ Use correct field name: categoriesWithMeats
          if (stats && stats.categoriesWithMeats) {
            stats.categoriesWithMeats.forEach((item) => {
              // ✅ Use correct property: meatCount
              countsMap.set(item.id, item.meatCount);
            });
          }
          setProductCounts(countsMap);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch categories";
        setError(message);
        setCategories([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchCategories({ page: 1, limit: 10 });
  }, [fetchCategories]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchCategories(options);
    },
    [fetchCategories]
  );

  return {
    categories,
    productCounts,
    loading,
    error,
    totalItems,
    filters,
    setFilters,
    reload,
  };
}