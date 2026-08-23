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

export const useStockLevels = (initialFilters?: Partial<StockFilters>) => {
  const [meats, setMeats] = useState<StockMeat[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState<StockFilters>({
    search: "",
    supplierId: undefined,
    categoryId: undefined,
    stockStatus: "all",
    sortBy: "name",
    sortOrder: "ASC",
    ...initialFilters,
  });

  // Fetch suppliers and categories for filter dropdowns
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
      const page = options?.page || 1;
      const limit = options?.limit || 10;

      setLoading(true);
      setError(null);

      try {
        // 1. Get all meats with filters
        const meatParams: any = {
          page,
          limit,
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

        // 2. Get all batches to calculate current stock
        const batchResponse = await batchAPI.getAll({
          status: "active",
          limit: 10000,
        });
        if (!batchResponse.status) throw new Error(batchResponse.message);
        const batches = batchResponse.data.items || [];

        // 3. Calculate current stock per meat
        const stockMap = new Map<number, number>();
        batches.forEach((batch) => {
          const current = stockMap.get(batch.meatId) || 0;
          stockMap.set(batch.meatId, current + batch.remainingQuantity);
        });

        // 4. Build stock meat list with computed stock
        const defaultThreshold = 10; // kg
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

        // 5. Apply stock status filter (client-side)
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch stock data";
        setError(message);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchFilterData();
  }, [fetchFilterData]);

  useEffect(() => {
    fetchStockData({ page: 1, limit: 10 });
  }, [fetchStockData]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchStockData(options);
    },
    [fetchStockData]
  );

  return {
    meats,
    suppliers,
    categories,
    loading,
    error,
    totalItems,
    filters,
    setFilters,
    reload,
  };
};