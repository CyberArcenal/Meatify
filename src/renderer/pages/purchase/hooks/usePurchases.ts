// src/renderer/pages/inventory/purchases/hooks/usePurchases.ts
import { useState, useEffect, useCallback } from "react";
import purchaseAPI, { type Purchase } from "../../../api/core/purchase";
import supplierAPI, { type Supplier } from "../../../api/core/supplier";

export interface PurchaseFilters {
  search: string;
  status: string;
  supplierId?: number;
  startDate?: string;
  endDate?: string;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

export const usePurchases = (initialFilters?: Partial<PurchaseFilters>) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState<PurchaseFilters>({
    search: "",
    status: "",
    supplierId: undefined,
    startDate: undefined,
    endDate: undefined,
    sortBy: "orderDate",
    sortOrder: "DESC",
    ...initialFilters,
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await supplierAPI.getActive();
      if (response.status) {
        setSuppliers(response.data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
    }
  }, []);

  const fetchPurchases = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const page = options?.page || 1;
      const limit = options?.limit || 10;

      setLoading(true);
      setError(null);
      try {
        const params: any = {
          page,
          limit,
          search: filters.search || undefined,
          status: filters.status || undefined,
          supplierId: filters.supplierId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        };

        const response = await purchaseAPI.getAll(params);
        if (response.status) {
          const data = response.data;
          setPurchases(data.items || []);
          setTotalItems(data.total || 0);
        } else {
          throw new Error(response.message || "Failed to fetch purchases");
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch purchases";
        setError(message);
        setPurchases([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchPurchases({ page: 1, limit: 10 });
    fetchSuppliers();
  }, [fetchPurchases, fetchSuppliers]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchPurchases(options);
    },
    [fetchPurchases]
  );

  return {
    purchases,
    suppliers,
    loading,
    error,
    totalItems,
    filters,
    setFilters,
    reload,
  };
};