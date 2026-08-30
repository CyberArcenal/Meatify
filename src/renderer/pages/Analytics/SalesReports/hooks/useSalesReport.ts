// src/renderer/pages/Analytics/SalesReports/hooks/useSalesReport.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { DailyTrend } from '../../../../api';
import salesReportAPI, { type SalesReportSummaryData, type SalesReportItem, type CustomerReportItem } from '../../../../api/analytics/salesReport';


type SaleEntry = {
  id: number;
  timestamp: string;
  customer?: { name: string } | null;
  paymentMethod: string;
  totalAmount: number;
  status: string;
  notes?: string | null;
  saleItems?: Array<{
    id: number;
    productId: number;
    product?: { name: string } | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

interface UseSalesReportParams {
  customerId?: number;
  status?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}

export const useSalesReport = (initialParams: UseSalesReportParams = {}) => {
  const [params, setParams] = useState<UseSalesReportParams>({
    page: 1,
    limit: 10,
    ...initialParams,
  });

  const [summary, setSummary] = useState<SalesReportSummaryData | null>(null);
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [productBreakdown, setProductBreakdown] = useState<SalesReportItem[]>([]);
  const [customerBreakdown, setCustomerBreakdown] = useState<CustomerReportItem[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setError(null);

    // ✅ SUMMARY – walang customerId
    const summaryParams: any = {};
    if (params.startDate) summaryParams.startDate = params.startDate;
    if (params.endDate) summaryParams.endDate = params.endDate;

    // ✅ SALES – conditional building
    const salesParams: any = {
      page: params.page || 1,
      limit: params.limit || 10,
      includeProductBreakdown: true,
      includeCustomerBreakdown: true,
    };

    if (params.customerId !== undefined && params.customerId !== null) {
      salesParams.customerId = params.customerId;
    }
    if (params.status) salesParams.status = params.status;
    if (params.paymentMethod) salesParams.paymentMethod = params.paymentMethod;
    if (params.startDate) salesParams.startDate = params.startDate;
    if (params.endDate) salesParams.endDate = params.endDate;
    if (params.searchTerm) salesParams.search = params.searchTerm;
    if (params.minAmount !== undefined && params.minAmount !== null) {
      salesParams.minAmount = params.minAmount;
    }
    if (params.maxAmount !== undefined && params.maxAmount !== null) {
      salesParams.maxAmount = params.maxAmount;
    }

    // Fetch summary
    setLoadingSummary(true);
    try {
      const summaryRes = await salesReportAPI.getSummary(summaryParams);
      if (!controller.signal.aborted) {
        if (summaryRes.status) {
          setSummary(summaryRes.data);
        } else {
          throw new Error(summaryRes.message || 'Failed to fetch summary');
        }
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setError(err.message || 'Failed to load summary');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoadingSummary(false);
      }
    }

    // Fetch sales
    setLoadingSales(true);
    try {
      const salesRes = await salesReportAPI.getData(salesParams);
      if (!controller.signal.aborted) {
        if (salesRes.status) {
          const data = salesRes.data;
          setSales(data.sales as SaleEntry[]);
          setProductBreakdown(data.productBreakdown || []);
          setCustomerBreakdown(data.customerBreakdown || []);
          setDailyTrend(data.dailyTrend || []);
          setTotal(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        } else {
          throw new Error(salesRes.message || 'Failed to fetch sales');
        }
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setError(err.message || 'Failed to load sales');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoadingSales(false);
      }
    }

    abortControllerRef.current = null;
  }, [params]);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const updateFilters = useCallback((newParams: Partial<UseSalesReportParams>) => {
    setParams((prev) => ({
      ...prev,
      ...newParams,
      page: newParams.page !== undefined ? newParams.page : 1,
    }));
  }, []);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    state: {
      summary,
      sales,
      productBreakdown,
      customerBreakdown,
      dailyTrend,
      total,
      totalPages,
      loadingSummary,
      loadingSales,
      error,
      page: params.page || 1,
    },
    updateFilters,
    refetch,
  };
};