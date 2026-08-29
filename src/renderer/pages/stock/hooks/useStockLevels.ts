// src/renderer/pages/inventory/stock/hooks/useStockLevels.ts
import { useState, useEffect, useCallback } from "react";
import meatAPI, { type Meat } from "../../../api/core/meat";
import batchAPI, { type Batch } from "../../../api/core/batch";
import supplierAPI, { type Supplier } from "../../../api/core/supplier";
import categoryAPI, { type Category } from "../../../api/core/category";

export interface StockFilters {
  search: string;
  supplierId?: number;
  categoryId?: number;
  stockStatus: "all" | "instock" | "lowstock" | "outstock";
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

export interface StockMeat extends Meat {
  currentStock: number;
  reorderLevel: number;
  reorderQty: number;
}

export interface StockSummary {
  totalMeats: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
}

export const useStockLevels = (initialFilters?: Partial<StockFilters>) => {
  const [meats, setMeats] = useState<StockMeat[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [summary, setSummary] = useState<StockSummary>({
    totalMeats: 0,
    totalStockValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0,
  });
  const [filters, setFilters] = useState<StockFilters>({
    search: "",
    supplierId: undefined,
    categoryId: undefined,
    stockStatus: "all",
    sortBy: "name",
    sortOrder: "ASC",
    ...initialFilters,
  });

  const fetchFilterData = useCallback(async () => {
    try {
      const [suppliersRes, categoriesRes] = await Promise.all([
        supplierAPI.getActive(),
        categoryAPI.getActive(),
      ]);
      if (suppliersRes.status) {
        setSuppliers(suppliersRes.data.items || []);
      }
      if (categoriesRes.status) {
        setCategories(categoriesRes.data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch filter data", err);
    }
  }, []);

  const fetchStockData = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const p = options?.page ?? page;
      const l = options?.limit ?? limit;

      setLoading(true);
      setError(null);

      try {
        const meatParams: any = {
          page: p,
          limit: l,
          search: filters.search || undefined,
          categoryId: filters.categoryId,
          supplierId: filters.supplierId,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        };

        const meatResponse = await meatAPI.getAll(meatParams);
        if (!meatResponse.status) throw new Error(meatResponse.message);
        const meatItems = meatResponse.data.items || [];
        const total = meatResponse.data.total || 0;

        const batchResponse = await batchAPI.getAll({
          status: "active",
          limit: 10000,
        });
        if (!batchResponse.status) throw new Error(batchResponse.message);
        const batches = batchResponse.data.items || [];

        const stockMap = new Map<number, number>();
        batches.forEach((batch) => {
          const current = stockMap.get(batch.meatId) || 0;
          stockMap.set(batch.meatId, current + batch.remainingQuantity);
        });

        const defaultThreshold = 10;
        const stockMeats: StockMeat[] = meatItems.map((meat) => {
          const currentStock = stockMap.get(meat.id) || 0;
          const reorderLevel = (meat as any).reorderLevel || defaultThreshold;
          const reorderQty = (meat as any).reorderQty || 20;

          return {
            ...meat,
            currentStock,
            reorderLevel,
            reorderQty,
          };
        });

        let filteredMeats = stockMeats;
        if (filters.stockStatus !== "all") {
          filteredMeats = stockMeats.filter((m) => {
            if (filters.stockStatus === "instock") return m.currentStock > m.reorderLevel;
            if (filters.stockStatus === "lowstock")
              return m.currentStock > 0 && m.currentStock <= m.reorderLevel;
            if (filters.stockStatus === "outstock") return m.currentStock === 0;
            return true;
          });
        }

        setMeats(filteredMeats);
        setTotalItems(filteredMeats.length);
        if (options?.page !== undefined) setPage(p);
        if (options?.limit !== undefined) setLimit(l);

        // Compute summary
        const totalStockValue = filteredMeats.reduce(
          (sum, m) => sum + m.currentStock * m.pricePerKg,
          0
        );
        const lowStockCount = filteredMeats.filter(
          (m) => m.currentStock > 0 && m.currentStock <= m.reorderLevel
        ).length;
        const outOfStockCount = filteredMeats.filter((m) => m.currentStock === 0).length;
        const inStockCount = filteredMeats.filter((m) => m.currentStock > m.reorderLevel).length;

        setSummary({
          totalMeats: filteredMeats.length,
          totalStockValue,
          lowStockCount,
          outOfStockCount,
          inStockCount,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch stock data";
        setError(message);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, limit]
  );

  useEffect(() => {
    fetchFilterData();
  }, [fetchFilterData]);

  // Auto-fetch when filters change
  useEffect(() => {
    fetchStockData({ page: 1, limit });
  }, [filters]);

  // Re-fetch when page/limit change
  useEffect(() => {
    fetchStockData({ page, limit });
  }, [page, limit]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchStockData(options);
    },
    [fetchStockData]
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
      supplierId: undefined,
      categoryId: undefined,
      stockStatus: "all",
      sortBy: "name",
      sortOrder: "ASC",
    });
    setPage(1);
  }, []);

  return {
    meats,
    suppliers,
    categories,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    page,
    limit,
    summary,
    reload,
    goToPage,
    changeLimit,
    resetFilters,
  };
};