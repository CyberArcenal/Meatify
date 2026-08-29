// src/renderer/pages/inventory/movements/hooks/useMovements.ts
import { useState, useEffect, useCallback } from "react";
import type { InventoryMovement, MovementStatistics } from "../../../api/core/inventoryMovement";
import inventoryMovementAPI from "../../../api/core/inventoryMovement";

export interface MovementFilters {
  movementType: "all" | "sale" | "refund" | "adjustment" | "purchase" | "expiry_write_off";
  startDate?: string;
  endDate?: string;
  search: string;
  direction: "all" | "positive" | "negative";
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface MovementSummary {
  totalToday: number;
  byType: Record<string, number>;
  mostMovedMeat: { name: string; count: number } | null;
}

export const formatMovementType = (type: string): string => {
  const map: Record<string, string> = {
    sale: "Sale",
    refund: "Return",
    adjustment: "Adjustment",
    purchase: "Purchase",
    expiry_write_off: "Expiry Write-off",
  };
  return map[type] || type;
};

export const getMovementTypeColor = (type: string): string => {
  switch (type) {
    case "sale":
      return "var(--accent-blue)";
    case "refund":
      return "var(--accent-red)";
    case "adjustment":
      return "var(--accent-amber)";
    case "purchase":
      return "var(--accent-green)";
    case "expiry_write_off":
      return "var(--accent-purple)";
    default:
      return "var(--text-tertiary)";
  }
};

export const useMovements = (initialFilters?: Partial<MovementFilters>) => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [filters, setFilters] = useState<MovementFilters>({
    movementType: "all",
    startDate: undefined,
    endDate: undefined,
    search: "",
    direction: "all",
    sortBy: "timestamp",
    sortOrder: "DESC",
    ...initialFilters,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [stats, setStats] = useState<MovementStatistics | null>(null);
  const [summary, setSummary] = useState<MovementSummary>({
    totalToday: 0,
    byType: {},
    mostMovedMeat: null,
  });

  const fetchMovements = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const p = options?.page ?? page;
      const l = options?.limit ?? limit;

      setLoading(true);
      setError(null);

      try {
        const params: any = {
          page: p,
          limit: l,
          movementType: filters.movementType === "all" ? undefined : filters.movementType,
          startDate: filters.startDate,
          endDate: filters.endDate,
          search: filters.search || undefined,
          direction: filters.direction === "all" ? undefined : filters.direction,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        };

        const response = await inventoryMovementAPI.getAll(params);
        if (!response.status) throw new Error(response.message);

        const data = response.data;
        setMovements(data.items || []);
        setTotalItems(data.total || 0);
        if (options?.page !== undefined) setPage(p);
        if (options?.limit !== undefined) setLimit(l);

        // Compute summary from items
        const today = new Date().toISOString().split("T")[0];
        const todayMovements = data.items.filter(
          (m) => new Date(m.timestamp).toISOString().split("T")[0] === today
        );
        const byType: Record<string, number> = {};
        todayMovements.forEach((m) => {
          byType[m.movementType] = (byType[m.movementType] || 0) + 1;
        });

        // Most moved meat (by absolute quantity)
        const meatMovements: Record<number, { name: string; total: number }> = {};
        data.items.forEach((m) => {
          if (m.meat && m.meat.id) {
            const id = m.meat.id;
            if (!meatMovements[id]) {
              meatMovements[id] = { name: m.meat.name, total: 0 };
            }
            meatMovements[id].total += Math.abs(m.qtyChange);
          }
        });
        let mostMovedMeat = null;
        let maxTotal = 0;
        Object.values(meatMovements).forEach((p) => {
          if (p.total > maxTotal) {
            maxTotal = p.total;
            mostMovedMeat = p;
          }
        });

        setSummary({
          totalToday: todayMovements.length,
          byType,
          mostMovedMeat,
        });
      } catch (err: any) {
        setError(err.message);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, limit]
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await inventoryMovementAPI.getStatistics();
      if (response.status) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch movement stats:", err);
    }
  }, []);

  // Auto-fetch when filters change
  useEffect(() => {
    fetchMovements({ page: 1, limit });
  }, [filters]);

  // Re-fetch when page/limit change
  useEffect(() => {
    fetchMovements({ page, limit });
  }, [page, limit]);

  // Initial stats fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchMovements(options);
      fetchStats();
    },
    [fetchMovements, fetchStats]
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
      movementType: "all",
      startDate: undefined,
      endDate: undefined,
      search: "",
      direction: "all",
      sortBy: "timestamp",
      sortOrder: "DESC",
    });
    setPage(1);
  }, []);

  return {
    movements,
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