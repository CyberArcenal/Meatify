// src/renderer/pages/Analytics/Customer/hooks/useCustomerInsights.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { CustomerInsight, CustomerInsightsSummaryData } from '../../../../api/analytics/customerInsights';
import customerInsightsAPI from '../../../../api/analytics/customerInsights';


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

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch summary and segmentation
  const fetchSummary = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(prev => ({ ...prev, summary: true }));
    setError(null);

    try {
      const res = await customerInsightsAPI.getSummary();
      if (!controller.signal.aborted) {
        if (res.status) {
          const data = res.data as CustomerInsightsSummaryData;
          setSummary({
            totalCustomers: data.totalCustomers,
            activeCustomers: data.activeCount,
            averageLoyaltyPoints: data.pointsSummary.average,
            newCustomersThisMonth: data.totalCustomers - data.inactiveCount,
          });

          setSegmentation({
            highValue: data.byStatus?.elite || 0,
            mediumValue: data.byStatus?.vip || 0,
            lowValue: data.byStatus?.regular || 0,
            inactive: data.inactiveCount || 0,
          });
        } else {
          throw new Error(res.message || 'Failed to fetch summary');
        }
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setError(err.message || 'Failed to load summary');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(prev => ({ ...prev, summary: false }));
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  // Fetch top spenders
  const fetchTopSpenders = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(prev => ({ ...prev, topSpenders: true }));

    try {
      const res = await customerInsightsAPI.getData({
        sortBy: 'totalSpent',
        sortOrder: 'DESC',
        limit: 5,
      });
      if (!controller.signal.aborted) {
        if (res.status) {
          const topSpendersList = (res.data.customers || []).slice(0, 5).map((c) => ({
            customerId: c.id,
            customerName: c.name,
            purchaseCount: c.purchaseCount || 0,
            totalSpent: c.totalSpent || 0,
          }));
          setTopSpenders(topSpendersList);
        } else {
          throw new Error(res.message || 'Failed to fetch top spenders');
        }
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setError(err.message || 'Failed to load top spenders');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(prev => ({ ...prev, topSpenders: false }));
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  // Fetch top loyalty members
  const fetchTopLoyalty = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(prev => ({ ...prev, topLoyalty: true }));

    try {
      const res = await customerInsightsAPI.getData({
        sortBy: 'loyaltyPointsBalance',
        sortOrder: 'DESC',
        limit: 5,
      });
      if (!controller.signal.aborted) {
        if (res.status) {
          const topLoyaltyList = (res.data.customers || []).slice(0, 5).map((c) => ({
            customerId: c.id,
            customerName: c.name,
            points: c.loyaltyPointsBalance || 0,
          }));
          setTopLoyalty(topLoyaltyList);
        } else {
          throw new Error(res.message || 'Failed to fetch top loyalty');
        }
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setError(err.message || 'Failed to load top loyalty');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(prev => ({ ...prev, topLoyalty: false }));
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  // Fetch customers table
  const fetchCustomers = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(prev => ({ ...prev, table: true }));

    // ✅ CONDITIONAL PARAMS
    const apiParams: any = {
      page: params.page || 1,
      limit: params.limit || 10,
    };
    if (params.search) apiParams.search = params.search;
    if (params.minPoints !== undefined && params.minPoints !== null) {
      apiParams.minPoints = params.minPoints;
    }
    if (params.maxPoints !== undefined && params.maxPoints !== null) {
      apiParams.maxPoints = params.maxPoints;
    }
    // hasLoyaltyPoints = minPoints > 0
    if (params.hasLoyaltyPoints) {
      apiParams.minPoints = 1;
    }

    try {
      const res = await customerInsightsAPI.getData(apiParams);
      if (!controller.signal.aborted) {
        if (res.status) {
          setCustomers(res.data.customers || []);
          setTotal(res.data.pagination.total || 0);
          setTotalPages(res.data.pagination.totalPages || 1);
        } else {
          throw new Error(res.message || 'Failed to fetch customers');
        }
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setError(err.message || 'Failed to load customers');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(prev => ({ ...prev, table: false }));
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [params.page, params.limit, params.search, params.minPoints, params.maxPoints, params.hasLoyaltyPoints]);

  // Fetch all data
  useEffect(() => {
    fetchSummary();
    fetchTopSpenders();
    fetchTopLoyalty();
    fetchCustomers();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when table params change
  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.page, params.limit, params.search, params.minPoints, params.maxPoints, params.hasLoyaltyPoints]);

  const updateFilters = useCallback((newParams: Partial<UseCustomerInsightsParams>) => {
    setParams((prev) => ({
      ...prev,
      ...newParams,
      page: newParams.page !== undefined ? newParams.page : 1,
    }));
  }, []);

  const refetch = useCallback(() => {
    fetchSummary();
    fetchTopSpenders();
    fetchTopLoyalty();
    fetchCustomers();
  }, [fetchSummary, fetchTopSpenders, fetchTopLoyalty, fetchCustomers]);

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