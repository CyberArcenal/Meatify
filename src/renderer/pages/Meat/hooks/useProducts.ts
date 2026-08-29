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

export const useMeat = (initialFilters?: Partial<MeatFilters>) => {
  const [meats, setMeats] = useState<Meat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filters, setFilters] = useState<MeatFilters>({
    search: "",
    status: "all",
    sortBy: "name",
    sortOrder: "ASC",
    ...initialFilters,
  });

  const fetchMeats = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const page = options?.page || 1;
      const limit = options?.limit || 10;

      setLoading(true);
      setError(null);

      try {
        const isActive =
          filters.status === "all" ? undefined : filters.status === "active";

        const response = await meatAPI.getAll({
          page,
          limit,
          search: filters.search || undefined,
          isActive,
          categoryId: filters.categoryId,
          supplierId: filters.supplierId,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        if (response.status) {
          const data = response.data;
          setMeats(data.data || []);
          setTotalItems(data.pagination.total || 0);
        } else {
          throw new Error(response.message || "Failed to fetch meats");
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch meats";
        setError(message);
        setMeats([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Load categories for filter dropdown
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

  // Load suppliers for filter dropdown
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

  useEffect(() => {
    fetchMeats({ page: 1, limit: 10 });
    fetchCategories();
    fetchSuppliers();
  }, [fetchMeats, fetchCategories, fetchSuppliers]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchMeats(options);
    },
    [fetchMeats]
  );

  return {
    meats,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    categories,
    suppliers,
    reload,
  };
};