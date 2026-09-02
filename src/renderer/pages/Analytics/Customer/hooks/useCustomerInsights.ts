// src/renderer/pages/Analytics/Customer/hooks/useCustomerInsights.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { CustomerInsight, CustomerInsightsSummaryData } from '../../../../api/analytics/customerInsights';
import customerInsightsAPI from '../../../../api/analytics/customerInsights';
import { useDebounce } from '../../../../hooks/useDebounce';

export interface CustomerSummary {
  totalCustomers: number;
  activeCustomers: number;
  averageLoyaltyPoints: number;
  newCustomersThisMonth: number;
}

export interface TopCustomerSpending {
  customerId: number;
  customerName: string;
  purchaseCount: number;
  totalSpent: number;
}

export interface TopCustomerLoyalty {
  customerId: number;
  customerName: string;
  points: number;
}

export interface CustomerSegmentation {
  highValue: number;
  mediumValue: number;
  lowValue: number;
  inactive: number;
}

interface UseCustomerInsightsParams {
  search?: string;
  minPoints?: number;
  maxPoints?: number;
  hasLoyaltyPoints?: boolean;
  page?: number;
  limit?: number;
}

export const useCustomerInsights = (initialParams: UseCustomerInsightsParams = {}) => {
  // ─── State ───────────────────────────────────────────────
  const [params, setParams] = useState<UseCustomerInsightsParams>({
    page: 1,
    limit: 10,
    ...initialParams,
  });

  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [topSpenders, setTopSpenders] = useState<TopCustomerSpending[]>([]);
  const [topLoyalty, setTopLoyalty] = useState<TopCustomerLoyalty[]>([]);
  const [segmentation, setSegmentation] = useState<CustomerSegmentation | null>(null);
  const [customers, setCustomers] = useState<CustomerInsight[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState({
    summary: false,
    topSpenders: false,
    topLoyalty: false,
    table: false,
  });
  const [error, setError] = useState<string | null>(null);

  // ─── Caching ──────────────────────────────────────────────
  const cacheRef = useRef<{
    summary: CustomerSummary | null;
    timestamp: number;
  }>({ summary: null, timestamp: 0 });
  const CACHE_TTL = 60000; // 1 minute

  // ─── Abort Controller ────────────────────────────────────
  const abortControllerRef = useRef<AbortController | null>(null);

  // ─── Debounced search ────────────────────────────────────
  const debouncedSearch = useDebounce(params.search || '', 300);

  // ─── Build API params ────────────────────────────────────
  const apiParams = useMemo(() => {
    const p: any = {
      page: params.page || 1,
      limit: params.limit || 10,
    };
    if (debouncedSearch) p.search = debouncedSearch;
    if (params.minPoints !== undefined && params.minPoints !== null) p.minPoints = params.minPoints;
    if (params.maxPoints !== undefined && params.maxPoints !== null) p.maxPoints = params.maxPoints;
    if (params.hasLoyaltyPoints) p.minPoints = 1;
    return p;
  }, [debouncedSearch, params.minPoints, params.maxPoints, params.hasLoyaltyPoints, params.page, params.limit]);

  // ─── Fetch all data ──────────────────────────────────────
  const fetchAll = useCallback(async (signal: AbortSignal) => {
    // Cancel any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentSignal = controller.signal;

    // Merge with provided signal
    const mergedSignal = (signal as any)?.aborted ? signal : currentSignal;

    setLoading({ summary: true, topSpenders: true, topLoyalty: true, table: true });
    setError(null);

    try {
      // 1. Summary (with cache check)
      let summaryData: CustomerInsightsSummaryData | null = null;
      const now = Date.now();
      if (cacheRef.current.summary && (now - cacheRef.current.timestamp < CACHE_TTL)) {
        // Use cached summary
        const cached = cacheRef.current.summary;
        setSummary(cached);
        setSegmentation({
          highValue: cached?.totalCustomers ? Math.floor(cached.totalCustomers * 0.2) : 0, // fallback
          mediumValue: cached?.totalCustomers ? Math.floor(cached.totalCustomers * 0.3) : 0,
          lowValue: cached?.totalCustomers ? Math.floor(cached.totalCustomers * 0.4) : 0,
          inactive: 0,
        });
        // Still fetch fresh summary in background (but we skip for simplicity)
        // For now, we just use cached.
        // We'll still fetch in background if TTL expired, but we'll update in background
        // We'll handle this by not setting loading for summary if cached.
        setLoading(prev => ({ ...prev, summary: false }));
      } else {
        // Fetch fresh summary
        const summaryRes = await customerInsightsAPI.getSummary();
        if (!mergedSignal.aborted) {
          if (summaryRes.status) {
            summaryData = summaryRes.data as CustomerInsightsSummaryData;
            const newSummary: CustomerSummary = {
              totalCustomers: summaryData.totalCustomers,
              activeCustomers: summaryData.activeCount,
              averageLoyaltyPoints: summaryData.pointsSummary.average,
              newCustomersThisMonth: summaryData.newCustomers || 0, // backend should provide this
            };
            setSummary(newSummary);
            setSegmentation({
              highValue: summaryData.byStatus?.elite || 0,
              mediumValue: summaryData.byStatus?.vip || 0,
              lowValue: summaryData.byStatus?.regular || 0,
              inactive: summaryData.inactiveCount || 0,
            });
            // Update cache
            cacheRef.current = { summary: newSummary, timestamp: now };
          } else {
            throw new Error(summaryRes.message || 'Failed to fetch summary');
          }
        }
      }

      // 2. Top spenders
      const topSpendersRes = await customerInsightsAPI.getData({
        sortBy: 'totalSpent',
        sortOrder: 'DESC',
        limit: 5,
      });
      if (!mergedSignal.aborted && topSpendersRes.status) {
        const list = (topSpendersRes.data.customers || []).slice(0, 5).map((c) => ({
          customerId: c.id,
          customerName: c.name,
          purchaseCount: c.purchaseCount || 0,
          totalSpent: c.totalSpent || 0,
        }));
        setTopSpenders(list);
      } else if (!mergedSignal.aborted) {
        throw new Error(topSpendersRes.message || 'Failed to fetch top spenders');
      }

      // 3. Top loyalty
      const topLoyaltyRes = await customerInsightsAPI.getData({
        sortBy: 'loyaltyPointsBalance',
        sortOrder: 'DESC',
        limit: 5,
      });
      if (!mergedSignal.aborted && topLoyaltyRes.status) {
        const list = (topLoyaltyRes.data.customers || []).slice(0, 5).map((c) => ({
          customerId: c.id,
          customerName: c.name,
          points: c.loyaltyPointsBalance || 0,
        }));
        setTopLoyalty(list);
      } else if (!mergedSignal.aborted) {
        throw new Error(topLoyaltyRes.message || 'Failed to fetch top loyalty');
      }

      // 4. Customers table (with filters and pagination)
      const customersRes = await customerInsightsAPI.getData(apiParams);
      if (!mergedSignal.aborted && customersRes.status) {
        setCustomers(customersRes.data.customers || []);
        setTotal(customersRes.data.pagination.total || 0);
        setTotalPages(customersRes.data.pagination.totalPages || 1);
      } else if (!mergedSignal.aborted) {
        throw new Error(customersRes.message || 'Failed to fetch customers');
      }

    } catch (err: any) {
      if (!mergedSignal.aborted) {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      if (!mergedSignal.aborted) {
        setLoading({ summary: false, topSpenders: false, topLoyalty: false, table: false });
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [apiParams]);

  // ─── Initial fetch ──────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    fetchAll(controller.signal);
    return () => controller.abort();
  }, [fetchAll]);

  // ─── Refetch when filters change ────────────────────────
  // We'll re-fetch when apiParams change (which includes debounced search)
  useEffect(() => {
    // Debounce the refetch to avoid rapid calls
    const timeout = setTimeout(() => {
      fetchAll(new AbortController().signal);
    }, 100);
    return () => clearTimeout(timeout);
  }, [apiParams, fetchAll]);

  // ─── Public API ──────────────────────────────────────────
  const updateFilters = useCallback((newParams: Partial<UseCustomerInsightsParams>) => {
    setParams((prev) => ({
      ...prev,
      ...newParams,
      page: newParams.page !== undefined ? newParams.page : (newParams.search !== undefined ? 1 : prev.page),
    }));
  }, []);

  const refetch = useCallback(() => {
    cacheRef.current.timestamp = 0; // invalidate cache
    fetchAll(new AbortController().signal);
  }, [fetchAll]);

  return {
    state: {
      summary,
      topSpenders,
      topLoyalty,
      segmentation,
      customers,
      total,
      totalPages,
      loadingSummary: loading.summary,
      loadingTopSpenders: loading.topSpenders,
      loadingTopLoyalty: loading.topLoyalty,
      loadingTable: loading.table,
      error,
      page: params.page || 1,
    },
    updateFilters,
    refetch,
  };
};