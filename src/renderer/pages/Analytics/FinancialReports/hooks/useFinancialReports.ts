// src/renderer/pages/Analytics/FinancialReports/hooks/useFinancialReports.ts
import { useState, useEffect, useCallback, useRef } from 'react';
// ✅ TAMANG PATH: 4 levels up to renderer, then api
import financialReportsAPI from '../../../../api/analytics/financialReports';
import type {
  FinancialSummary,
  FinancialData,
  FinancialPeriodData,
  TopProduct,
} from '../../../../api/analytics/financialReports';

interface UseFinancialReportsParams {
  startDate?: string;
  endDate?: string;
  revenueGroupBy?: 'paymentMethod' | 'product';
  profitGroupBy?: 'day' | 'week' | 'month';
}

type RevenueBreakdownItem = {
  name: string;
  amount: number;
  count: number;
};

type ProfitLossItem = FinancialPeriodData;

export const useFinancialReports = (initialParams: UseFinancialReportsParams = {}) => {
  const [params, setParams] = useState<UseFinancialReportsParams>({
    revenueGroupBy: 'paymentMethod',
    profitGroupBy: 'day',
    ...initialParams,
  });

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdownItem[]>([]);
  const [profitLoss, setProfitLoss] = useState<ProfitLossItem[]>([]);
  const [loading, setLoading] = useState({
    summary: false,
    revenue: false,
    profit: false,
  });
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading({ summary: true, revenue: true, profit: true });
    setError(null);

    const apiParams: any = {
      groupBy: params.profitGroupBy || 'day',
    };
    if (params.startDate) apiParams.startDate = params.startDate;
    if (params.endDate) apiParams.endDate = params.endDate;

    try {
      const res = await financialReportsAPI.getData(apiParams);
      if (!controller.signal.aborted) {
        if (res.status) {
          const data = res.data as FinancialData;

          setSummary(data.summary as unknown as FinancialSummary);

          if (params.revenueGroupBy === 'paymentMethod') {
            const items: RevenueBreakdownItem[] = Object.entries(data.summary.paymentBreakdown).map(
              ([name, total]) => ({
                name,
                amount: total,
                count: 0,
              })
            );
            setRevenueBreakdown(items);
          } else {
            const items: RevenueBreakdownItem[] = data.summary.topProducts.map((p: TopProduct) => ({
              name: p.meatName,
              amount: p.totalRevenue,
              count: p.count,
            }));
            setRevenueBreakdown(items);
          }

          setProfitLoss(data.groupedData as ProfitLossItem[]);
        } else {
          throw new Error(res.message || 'Failed to fetch financial data');
        }
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setError(err.message || 'Failed to load financial data');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading({ summary: false, revenue: false, profit: false });
    }
  }, [params.startDate, params.endDate, params.revenueGroupBy, params.profitGroupBy]);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const updateFilters = useCallback((newParams: Partial<UseFinancialReportsParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    state: {
      summary,
      revenueBreakdown,
      profitLoss,
      loadingSummary: loading.summary,
      loadingRevenue: loading.revenue,
      loadingProfit: loading.profit,
      error,
    },
    updateFilters,
    refetch,
  };
};