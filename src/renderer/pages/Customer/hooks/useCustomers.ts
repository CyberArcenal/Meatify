// src/renderer/pages/customer/hooks/useCustomers.ts
import { useState, useEffect, useCallback } from "react";
import customerAPI, { type Customer, type PaginatedCustomers } from "../../../api/core/customer";

export interface CustomerFilters {
  search: string;
  status: "all" | "vip" | "elite" | "regular";
  sortBy: "name" | "points" | "createdAt";
  sortOrder: "ASC" | "DESC";
  minPoints?: number;
  maxPoints?: number;
}

interface Metrics {
  total: number;
  vipCount: number;
  eliteCount: number;
  regularCount: number;
  newThisMonth: number;
}

// Map sortBy to actual API field names
const SORT_FIELD_MAP: Record<CustomerFilters["sortBy"], string> = {
  name: "name",
  points: "loyaltyPointsBalance",
  createdAt: "createdAt",
};

export const useCustomers = (initialFilters: CustomerFilters) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filters, setFilters] = useState<CustomerFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    vipCount: 0,
    eliteCount: 0,
    regularCount: 0,
    newThisMonth: 0,
  });

  const fetchCustomers = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const page = options?.page || 1;
      const limit = options?.limit || 10;

      setLoading(true);
      setError(null);
      try {
        // Build search params – use search() which supports status & pagination
        const params: any = {
          page,
          limit,
          searchTerm: filters.search || undefined,
          minPoints: filters.minPoints,
          maxPoints: filters.maxPoints,
          sortBy: SORT_FIELD_MAP[filters.sortBy],
          sortOrder: filters.sortOrder,
        };

        // Only add status if not "all"
        if (filters.status !== "all") {
          params.status = filters.status;
        }

        // Use search() instead of getAll() for better filtering
        const response = await customerAPI.search(params);
        if (response.status) {
          const paginated: PaginatedCustomers = response.data;
          const items = paginated.items || [];
          const total = paginated.total || 0;

          setCustomers(items);
          setTotalItems(total);

          // Compute metrics from the returned items (already filtered by status)
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const metrics: Metrics = {
            total: total,
            vipCount: items.filter((c) => c.status === "vip").length,
            eliteCount: items.filter((c) => c.status === "elite").length,
            regularCount: items.filter((c) => c.status === "regular").length,
            newThisMonth: items.filter(
              (c) => new Date(c.createdAt) >= firstDayOfMonth
            ).length,
          };
          setMetrics(metrics);
        } else {
          throw new Error(response.message);
        }
      } catch (err: any) {
        setError(err.message);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Initial load with default pagination
  useEffect(() => {
    fetchCustomers({ page: 1, limit: 10 });
  }, [fetchCustomers]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchCustomers(options);
    },
    [fetchCustomers]
  );

  return {
    customers,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    metrics,
    reload,
  };
};