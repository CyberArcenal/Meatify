// src/renderer/pages/Analytics/InventoryReports/hooks/useInventoryReports.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  type InventorySummary,
  type MeatInventorySummary,
  type InventorySummaryData,
  type CategorySummary,
  type SupplierSummary,
  inventoryReportsAPI,
} from '../../../../api';
import type { InventoryMovement } from '../../../../api/core/inventoryMovement';

interface UseInventoryReportsParams {
  categoryId?: number;
  supplierId?: number;
  startDate?: string;
  endDate?: string;
  movementPage?: number;
  // ✅ We keep movementLimit in interface but we'll ignore it and use constant 10
  movementLimit?: number;
}

const MOVEMENT_LIMIT = 10; // ✅ Force 10 items per page

export const useInventoryReports = (initialParams: UseInventoryReportsParams = {}) => {
  const safeParams = initialParams || {};

  const [params, setParams] = useState<UseInventoryReportsParams>({
    movementPage: 1,
    ...safeParams,
  });

  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [lowStock, setLowStock] = useState<MeatInventorySummary[]>([]);
  const [outOfStock, setOutOfStock] = useState<MeatInventorySummary[]>([]);
  const [allMovements, setAllMovements] = useState<InventoryMovement[]>([]);
  const [stats, setStats] = useState<InventorySummaryData | null>(null);
  const [topValueItems, setTopValueItems] = useState<MeatInventorySummary[]>([]);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [supplierSummary, setSupplierSummary] = useState<SupplierSummary[]>([]);

  const [loading, setLoading] = useState({
    summary: false,
    movements: false,
  });
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // ─── Client-side pagination ─────────────────────────────────────
  const page = params.movementPage ?? 1;
  const limit = MOVEMENT_LIMIT; // ✅ Always 10
  const total = allMovements.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const paginatedMovements = useMemo(() => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return allMovements.slice(start, end);
  }, [allMovements, page, limit]);

  // ─── Fetch Summary ─────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(prev => ({ ...prev, summary: true }));
    setError(null);

    const summaryParams: any = {};
    if (params.categoryId !== undefined && params.categoryId !== null) {
      summaryParams.categoryId = params.categoryId;
    }
    if (params.supplierId !== undefined && params.supplierId !== null) {
      summaryParams.supplierId = params.supplierId;
    }

    try {
      const res = await inventoryReportsAPI.getSummary(summaryParams);
      if (!controller.signal.aborted) {
        if (res.status) {
          const data = res.data as InventorySummaryData;
          setSummary(data.summary);
          setLowStock(data.lowStockItems || []);
          setOutOfStock(data.outOfStockItems || []);
          setTopValueItems(data.topValueItems || []);
          setCategorySummary(data.categorySummary || []);
          setSupplierSummary(data.supplierSummary || []);
          setStats(data);
        } else {
          throw new Error(res.message || 'Failed to fetch summary');
        }
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setError(err.message || 'Failed to load inventory summary');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(prev => ({ ...prev, summary: false }));
    }
  }, [params.categoryId, params.supplierId]);

  // ─── Fetch All Movements ───────────────────────────────────────
  const fetchMovements = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(prev => ({ ...prev, movements: true }));

    const movementParams: any = {
      includeMovementHistory: true,
      limit: 10000, // get all, we'll paginate client-side
    };
    if (params.categoryId !== undefined && params.categoryId !== null) {
      movementParams.categoryId = params.categoryId;
    }
    if (params.supplierId !== undefined && params.supplierId !== null) {
      movementParams.supplierId = params.supplierId;
    }
    if (params.startDate) movementParams.startDate = params.startDate;
    if (params.endDate) movementParams.endDate = params.endDate;

    try {
      const res = await inventoryReportsAPI.getData(movementParams);
      if (!controller.signal.aborted) {
        if (res.status) {
          setAllMovements(res.data.movementHistory || []);
        } else {
          throw new Error(res.message || 'Failed to fetch movements');
        }
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setError(err.message || 'Failed to load movements');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(prev => ({ ...prev, movements: false }));
    }
  }, [params.categoryId, params.supplierId, params.startDate, params.endDate]);

  // ─── Auto-fetch ────────────────────────────────────────────────
  useEffect(() => {
    fetchSummary();
    fetchMovements();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSummary, fetchMovements]);

  // ─── Public API ────────────────────────────────────────────────
  const updateFilters = useCallback((newParams: Partial<UseInventoryReportsParams>) => {
    setParams((prev) => ({
      ...prev,
      ...newParams,
      movementPage: newParams.movementPage !== undefined ? newParams.movementPage : 1,
    }));
  }, []);

  const refetch = useCallback(() => {
    fetchSummary();
    fetchMovements();
  }, [fetchSummary, fetchMovements]);

  const setMovementPage = useCallback((page: number) => {
    updateFilters({ movementPage: page });
  }, [updateFilters]);

  return {
    state: {
      summary,
      lowStock,
      outOfStock,
      movements: paginatedMovements,
      movementTotal: total,
      movementTotalPages: totalPages,
      movementPage: page,
      stats,
      topValueItems,
      categorySummary,
      supplierSummary,
      loadingSummary: loading.summary,
      loadingMovements: loading.movements,
      error,
    },
    updateFilters,
    refetch,
    setMovementPage,
  };
};