// src/renderer/pages/inventory/purchases/hooks/usePurchases.ts
import { useState, useEffect, useCallback } from "react";
import purchaseAPI, { type Purchase, type PurchaseStatistics } from "../../../api/core/purchase";
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

export interface PurchaseSummary {
  totalPending: number;
  totalApproved: number;
  totalCompleted: number;
  totalCancelled: number;
  totalAmount: number;
  averageAmount: number;
}

export const usePurchases = (initialFilters?: Partial<PurchaseFilters>) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [stats, setStats] = useState<PurchaseStatistics | null>(null);
  const [summary, setSummary] = useState<PurchaseSummary>({
    totalPending: 0,
    totalApproved: 0,
    totalCompleted: 0,
    totalCancelled: 0,
    totalAmount: 0,
    averageAmount: 0,
  });
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
      const p = options?.page ?? page;
      const l = options?.limit ?? limit;

      setLoading(true);
      setError(null);
      try {
        const params: any = {
          page: p,
          limit: l,
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
          if (options?.page !== undefined) setPage(p);
          if (options?.limit !== undefined) setLimit(l);

          // Compute summary from items
          const items = data.items || [];
          const statusCounts = { pending: 0, approved: 0, completed: 0, cancelled: 0 };
          let totalAmount = 0;
          items.forEach((p) => {
            if (p.status === "pending") statusCounts.pending++;
            else if (p.status === "approved") statusCounts.approved++;
            else if (p.status === "completed") {
              statusCounts.completed++;
              totalAmount += p.totalAmount;
            } else if (p.status === "cancelled") statusCounts.cancelled++;
          });
          const completedCount = statusCounts.completed || 1;
          setSummary({
            totalPending: statusCounts.pending,
            totalApproved: statusCounts.approved,
            totalCompleted: statusCounts.completed,
            totalCancelled: statusCounts.cancelled,
            totalAmount: totalAmount,
            averageAmount: completedCount > 0 ? totalAmount / completedCount : 0,
          });
        } else {
          throw new Error(response.message || "Failed to fetch purchases");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch purchases";
        setError(message);
        setPurchases([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, limit]
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await purchaseAPI.getStatistics();
      if (response.status) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch purchase stats", err);
    }
  }, []);

  // Auto-fetch when filters change
  useEffect(() => {
    fetchPurchases({ page: 1, limit });
  }, [filters]);

  // Re-fetch when page/limit change
  useEffect(() => {
    fetchPurchases({ page, limit });
  }, [page, limit]);

  // Initial stats fetch
  useEffect(() => {
    fetchStats();
    fetchSuppliers();
  }, [fetchStats, fetchSuppliers]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchPurchases(options);
      fetchStats();
    },
    [fetchPurchases, fetchStats]
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
      status: "",
      supplierId: undefined,
      startDate: undefined,
      endDate: undefined,
      sortBy: "orderDate",
      sortOrder: "DESC",
    });
    setPage(1);
  }, []);

  return {
    purchases,
    suppliers,
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
    fetchStats,
    goToPage,
    changeLimit,
    resetFilters,
  };
};