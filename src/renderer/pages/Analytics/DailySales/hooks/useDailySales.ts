// src/renderer/pages/Analytics/DailySales/hooks/useDailySales.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import dailySalesAPI, { type DailySale } from '../../../../api/analytics/dailySales';

export interface DailySalesStats {
  totalRevenue: number;
  totalSales: number;
  averageDailySales: number;
  bestDay: { date: string; total: number } | null;
}

export interface DailySalesChartPoint {
  date: string;
  total: number;
  count: number;
}

export interface DailySalesEntry {
  date: string;
  count: number;
  total: number;
  average: number;
  paidCount: number;
}

interface UseDailySalesParams {
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const useDailySales = (initialParams: UseDailySalesParams = {}) => {
  const [params, setParams] = useState<UseDailySalesParams>({
    page: 1,
    limit: 10,
    ...initialParams,
  });

  const [stats, setStats] = useState<DailySalesStats | null>(null);
  const [chartData, setChartData] = useState<DailySalesChartPoint[]>([]);
  const [tableData, setTableData] = useState<DailySalesEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState({
    stats: false,
    chart: false,
    table: false,
  });
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper: aggregate sales by date
  const aggregateByDate = useCallback((sales: DailySale[]) => {
    const map = new Map<string, { count: number; total: number; paidCount: number }>();
    sales.forEach(sale => {
      const date = sale.timestamp.split('T')[0];
      const current = map.get(date) || { count: 0, total: 0, paidCount: 0 };
      current.count += 1;
      current.total += sale.totalAmount;
      if (sale.status === 'paid') current.paidCount += 1;
      map.set(date, current);
    });
    return Array.from(map.entries()).map(([date, agg]) => ({
      date,
      count: agg.count,
      total: agg.total,
      average: agg.count > 0 ? agg.total / agg.count : 0,
      paidCount: agg.paidCount,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  const fetchData = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading({ stats: true, chart: true, table: true });
    setError(null);

    // ✅ CONDITIONAL PARAMS – iwasan ang undefined
    const apiParams: any = {
      limit: 10000, // fetch many to aggregate client-side
    };
    if (params.startDate) apiParams.startDate = params.startDate;
    if (params.endDate) apiParams.endDate = params.endDate;
    if (params.paymentMethod) apiParams.paymentMethod = params.paymentMethod;
    if (params.status) apiParams.status = params.status;

    try {
      const res = await dailySalesAPI.getData(apiParams);
      if (!controller.signal.aborted) {
        if (res.status) {
          const sales = res.data.sales;
          const daily = aggregateByDate(sales);

          // Stats
          const totalRevenue = daily.reduce((sum, d) => sum + d.total, 0);
          const totalSales = daily.reduce((sum, d) => sum + d.count, 0);
          const bestDay = daily.reduce<{ date: string; total: number } | null>((best, d) => {
            if (!best || d.total > best.total) return { date: d.date, total: d.total };
            return best;
          }, null);
          const averageDailySales = daily.length > 0 ? totalRevenue / daily.length : 0;

          setStats({
            totalRevenue,
            totalSales,
            averageDailySales,
            bestDay,
          });

          setChartData(daily.map(d => ({ date: d.date, total: d.total, count: d.count })));

          // Table data with client-side pagination
          const limit = params.limit || 10;
          const page = params.page || 1;
          setTotal(daily.length);
          setTotalPages(Math.ceil(daily.length / limit));
          const startIdx = (page - 1) * limit;
          setTableData(daily.slice(startIdx, startIdx + limit));
        } else {
          throw new Error(res.message || 'Failed to fetch daily sales');
        }
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setError(err.message || 'Failed to load daily sales');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading({ stats: false, chart: false, table: false });
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [params, aggregateByDate]);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const updateFilters = useCallback((newParams: Partial<UseDailySalesParams>) => {
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
      stats,
      chartData,
      tableData,
      total,
      totalPages,
      loadingStats: loading.stats,
      loadingChart: loading.chart,
      loadingTable: loading.table,
      error,
      page: params.page || 1,
    },
    updateFilters,
    refetch,
  };
};