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
  const [transactions, setTransactions] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
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

  const fetchTransactions = useCallback(
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
          search: filters.search || undefined,
          paymentMethod: filters.paymentMethod || undefined,
          status: filters.status || undefined,
          sortBy: "timestamp",
          sortOrder: "DESC",
        });

        if (response.status) {
          const data = response.data;
          setTransactions(data.items || []);
          setTotalItems(data.total || 0);
          if (options?.page !== undefined) setPage(p);
          if (options?.limit !== undefined) setLimit(l);

          // Compute summary
          const today = new Date().toISOString().split("T")[0];
          const todayTransactions = (data.items || []).filter((t) => {
            const txDate = new Date(t.timestamp).toISOString().split("T")[0];
            return txDate === today && t.status === "paid";
          });
          const revenue = todayTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
          const count = todayTransactions.length;
          const avg = count > 0 ? revenue / count : 0;
          const refundsToday = (data.items || []).filter(
            (t) =>
              new Date(t.timestamp).toISOString().split("T")[0] === today &&
              t.status === "refunded"
          ).length;

          setSummary({
            todayTransactions: count,
            todayRevenue: revenue,
            averageTicket: avg,
            refundsToday,
          });
        } else {
          throw new Error(response.message || "Failed to fetch transactions");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch transactions";
        setError(message);
        setTransactions([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, limit]
  );

  // ✅ Auto-fetch when filters, page, or limit change
  useEffect(() => {
    fetchTransactions({ page, limit });
  }, [filters, page, limit, fetchTransactions]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchTransactions(options);
    },
    [fetchTransactions]
  );

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1) {
      setPage(newPage);
    }
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
    transactions,
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