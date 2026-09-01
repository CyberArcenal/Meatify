// src/renderer/pages/sales/transactions/hooks/useTransactions.ts
import { useState, useEffect, useCallback } from "react";
import saleAPI, { type Sale } from "../../../api/core/sale";
import { dialogs } from "../../../utils/dialogs";

export type PaymentMethod = "cash" | "card" | "wallet";
export type SaleStatus = "initiated" | "paid" | "refunded" | "voided";

export interface TransactionFilters {
  startDate: string;
  endDate: string;
  search: string;
  paymentMethod: PaymentMethod | "";
  status: SaleStatus | "";
}

export interface TransactionSummary {
  todayTransactions: number;
  todayRevenue: number;
  averageTicket: number;
  refundsToday: number;
}

export const useTransactions = (initialFilters?: Partial<TransactionFilters>) => {
  const [allTransactions, setAllTransactions] = useState<Sale[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState<TransactionSummary>({
    todayTransactions: 0,
    todayRevenue: 0,
    averageTicket: 0,
    refundsToday: 0,
  });

  const [filters, setFilters] = useState<TransactionFilters>({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    search: "",
    paymentMethod: "",
    status: "",
    ...initialFilters,
  });

  const loadTransactions = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const p = options?.page ?? page;
      const l = options?.limit ?? limit;

      setLoading(true);
      setError(null);
      try {
        const response = await saleAPI.getAll({
          page: p,
          limit: l,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          sortBy: "timestamp",
          sortOrder: "DESC",
        });

        if (response.status) {
          const data = response.data;
          const items = data.items || [];
          setAllTransactions(items);
          setTotalItems(data.total || 0);
          if (options?.page !== undefined) setPage(p);
          if (options?.limit !== undefined) setLimit(l);

          // Compute summary from all items (unfiltered)
          const today = new Date().toISOString().split("T")[0];
          const todayTransactions = items.filter((t) => {
            const txDate = new Date(t.timestamp).toISOString().split("T")[0];
            return txDate === today && t.status === "paid";
          });
          const revenue = todayTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
          const count = todayTransactions.length;
          const avg = count > 0 ? revenue / count : 0;
          const refundsToday = items.filter(
            (t) => new Date(t.timestamp).toISOString().split("T")[0] === today && t.status === "refunded"
          ).length;

          setSummary({
            todayTransactions: count,
            todayRevenue: revenue,
            averageTicket: avg,
            refundsToday,
          });
        } else {
          throw new Error(response.message);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load transactions");
        await dialogs.alert({ title: "Error", message: err.message });
      } finally {
        setLoading(false);
      }
    },
    [filters.startDate, filters.endDate, page, limit]
  );

  // Apply local filters (search, paymentMethod, status)
  useEffect(() => {
    let filtered = [...allTransactions];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((tx) => {
        if (tx.id.toString().includes(searchLower)) return true;
        if (tx.customer?.name?.toLowerCase().includes(searchLower)) return true;
        return tx.saleItems.some(
          (item) =>
            item.meat?.sku?.toLowerCase().includes(searchLower) ||
            item.meat?.name?.toLowerCase().includes(searchLower)
        );
      });
    }

    if (filters.paymentMethod) {
      filtered = filtered.filter((tx) => tx.paymentMethod === filters.paymentMethod);
    }

    if (filters.status) {
      filtered = filtered.filter((tx) => tx.status === filters.status);
    }

    setFilteredTransactions(filtered);
  }, [allTransactions, filters.search, filters.paymentMethod, filters.status]);

  // Auto-fetch when filters change (but keep pagination to 1)
  useEffect(() => {
    loadTransactions({ page: 1, limit });
  }, [filters.startDate, filters.endDate]);

  // Re-fetch when page/limit change
  useEffect(() => {
    loadTransactions({ page, limit });
  }, [page, limit]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      return loadTransactions(options);
    },
    [loadTransactions]
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
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      search: "",
      paymentMethod: "",
      status: "",
    });
    setPage(1);
  }, []);

  return {
    transactions: filteredTransactions,
    allTransactions,
    filters,
    setFilters,
    loading,
    error,
    totalItems: allTransactions.length,
    page,
    limit,
    summary,
    reload,
    goToPage,
    changeLimit,
    resetFilters,
  };
};