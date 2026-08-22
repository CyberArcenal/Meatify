// src/renderer/pages/inventory/movements/hooks/useMovements.ts
import { useState, useEffect, useCallback } from "react";
import type { InventoryMovement, PaginatedMovements } from "../../../api/core/inventoryMovement";
import inventoryMovementAPI from "../../../api/core/inventoryMovement";


export interface MovementFilters {
  movementType: "all" | "sale" | "refund" | "adjustment" | "purchase" | "expiry_write_off";
  startDate?: string;
  endDate?: string;
  search: string;
  direction: "all" | "positive" | "negative";
}

interface Summary {
  totalToday: number;
  byType: Record<string, number>;
  mostMovedMeat: { name: string; count: number } | null;
}

// Helper functions
export const formatMovementType = (type: string): string => {
  const map: Record<string, string> = {
    sale: "Sale",
    refund: "Refund",
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

export const useMovements = (initialFilters: MovementFilters) => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [filters, setFilters] = useState<MovementFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState<Summary>({
    totalToday: 0,
    byType: {},
    mostMovedMeat: null,
  });

  const fetchMovements = useCallback(
    async (options?: { page?: number; limit?: number }) => {
      const page = options?.page || 1;
      const limit = options?.limit || 10;

      setLoading(true);
      setError(null);
      try {
        const params: any = {
          page,
          limit,
          movementType:
            filters.movementType === "all" ? undefined : filters.movementType,
          startDate: filters.startDate,
          endDate: filters.endDate,
          search: filters.search || undefined,
          direction: filters.direction === "all" ? undefined : filters.direction,
        };
        const response = await inventoryMovementAPI.getAll(params);
        if (!response.status) throw new Error(response.message);
        const paginated: PaginatedMovements = response.data;
        setMovements(paginated.items || []);
        setTotalItems(paginated.total || 0);

        // Compute summary from items
        const today = new Date().toISOString().split("T")[0];
        const todayMovements = paginated.items.filter(
          (m) => new Date(m.timestamp).toISOString().split("T")[0] === today
        );
        const byType: Record<string, number> = {};
        todayMovements.forEach((m) => {
          byType[m.movementType] = (byType[m.movementType] || 0) + 1;
        });

        // Most moved meat (by absolute quantity)
        const meatMovements: Record<number, { name: string; total: number }> = {};
        paginated.items.forEach((m) => {
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
    [filters]
  );

  useEffect(() => {
    fetchMovements({ page: 1, limit: 10 });
  }, [fetchMovements]);

  const reload = useCallback(
    (options?: { page?: number; limit?: number }) => {
      fetchMovements(options);
    },
    [fetchMovements]
  );

  return {
    movements,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    reload,
    summary,
  };
};