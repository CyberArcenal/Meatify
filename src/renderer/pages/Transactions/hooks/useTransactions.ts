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

export const useTransactions = (initialFilters: TransactionFilters) => {
  const [allTransactions, setAllTransactions] = useState<Sale[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Sale[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);

  const loadTransactions = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const page = options?.page || 1;
      const limit = options?.limit || 10;

      setLoading(true);
      setError(null);
      try {
        const response = await saleAPI.getAll({
          page,
          limit,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          sortBy: "timestamp",
          sortOrder: "DESC",
        });

        if (response.status) {
          const data = response.data;
          setAllTransactions(data.items || []);
          setTotalItems(data.total || 0);
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
    [filters.startDate, filters.endDate]
  );

  // Apply local filters (search, paymentMethod, status)
  useEffect(() => {
    let filtered = [...allTransactions];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((tx) => {
        // match by ID
        if (tx.id.toString().includes(searchLower)) return true;
        // match by customer name
        if (tx.customer?.name?.toLowerCase().includes(searchLower)) return true;
        // match by any meat SKU or name in sale items
        return tx.saleItems.some(
          (item) =>
            item.meat?.sku?.toLowerCase().includes(searchLower) ||
            item.meat?.name?.toLowerCase().includes(searchLower)
        );
      });
    }

    if (filters.paymentMethod) {
      filtered = filtered.filter(
        (tx) => tx.paymentMethod === filters.paymentMethod
      );
    }

    if (filters.status) {
      filtered = filtered.filter((tx) => tx.status === filters.status);
    }

    setFilteredTransactions(filtered);
  }, [allTransactions, filters.search, filters.paymentMethod, filters.status]);

  // Initial load with default pagination
  useEffect(() => {
    loadTransactions({ page: 1, limit: 10 });
  }, [loadTransactions]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      loadTransactions(options);
    },
    [loadTransactions]
  );

  return {
    transactions: filteredTransactions, // for table (filtered)
    allTransactions, // for stats (unfiltered)
    filters,
    setFilters,
    loading,
    error,
    totalItems: allTransactions.length, // for pagination (use total from API?)
    reload,
  };
};