// src/renderer/pages/Analytics/InventoryReports/hooks/useInventoryReports.ts
import { useState, useEffect, useCallback, useRef } from 'react';
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
}

export const useInventoryReports = (initialParams: UseInventoryReportsParams = {}) => {
  const [params, setParams] = useState<UseInventoryReportsParams>({
    ...initialParams,
  });

  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [lowStock, setLowStock] = useState<MeatInventorySummary[]>([]);
  const [outOfStock, setOutOfStock] = useState<MeatInventorySummary[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
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

  const fetchSummary = useCallback(async () => {
    // Cancel previous request
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
      // ✅ Only update state if not aborted
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
      // ✅ Only set error if not aborted
      if (!controller.signal.aborted) {
        setError(err.message || 'Failed to load inventory summary');
      }
    } finally {
      // ✅ FIX: Always set loading to false, even if aborted
      // Check if this is still the current request
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(prev => ({ ...prev, summary: false }));
    }
  }, [params.categoryId, params.supplierId]);

  const fetchMovements = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(prev => ({ ...prev, movements: true }));

    const movementParams: any = {
      includeMovementHistory: true,
      limit: 100,
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
          setMovements(res.data.movementHistory || []);
        } else {
          throw new Error(res.message || 'Failed to fetch movements');
        }
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setError(err.message || 'Failed to load movements');
      }
    } finally {
      // ✅ FIX: Always set loading to false, even if aborted
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(prev => ({ ...prev, movements: false }));
    }
  }, [params.categoryId, params.supplierId, params.startDate, params.endDate]);

  // Auto-fetch on mount and when fetch functions change
  useEffect(() => {
    fetchSummary();
    fetchMovements();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSummary, fetchMovements]);

  const updateFilters = useCallback((newParams: Partial<UseInventoryReportsParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  const refetch = useCallback(() => {
    fetchSummary();
    fetchMovements();
  }, [fetchSummary, fetchMovements]);

  return {
    state: {
      summary,
      lowStock,
      outOfStock,
      movements,
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
  };
};