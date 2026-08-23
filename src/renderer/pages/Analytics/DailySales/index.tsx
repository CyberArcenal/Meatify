import React, { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';

import FilterBar from './components/FilterBar';
import type { DailySale, DailySalesSummary } from '../../../api/analytics/dailySales';
import dailySalesAPI from '../../../api/analytics/dailySales';
import SummaryCards from './components/SummaryCards';
import SalesChart from './components/SalesChart';
import SalesTable from './components/SalesTable';

// Local types derived from the API response
type DailySalesStats = {
  totalRevenue: number;
  totalSales: number;
  averageDailySales: number;
  bestDay: { date: string; total: number } | null;
};

type DailySalesChartPoint = {
  date: string;
  total: number;
  count: number;
};

type DailySalesEntry = {
  date: string;
  count: number;
  total: number;
  average: number;
  paidCount: number;
};

const DailySalesPage: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [stats, setStats] = useState<DailySalesStats | null>(null);
  const [chartData, setChartData] = useState<DailySalesChartPoint[]>([]);
  const [tableData, setTableData] = useState<DailySalesEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // ------------------------------------------------------------------
  // Helper: aggregate sales by date
  // ------------------------------------------------------------------
  const aggregateByDate = (sales: DailySale[]) => {
    const map = new Map<string, { count: number; total: number; paidCount: number }>();
    sales.forEach(sale => {
      const date = sale.timestamp.split('T')[0]; // YYYY-MM-DD
      const current = map.get(date) || { count: 0, total: 0, paidCount: 0 };
      current.count += 1;
      current.total += sale.totalAmount;
      if (sale.status === 'completed') current.paidCount += 1;
      map.set(date, current);
    });
    return Array.from(map.entries()).map(([date, agg]) => ({
      date,
      count: agg.count,
      total: agg.total,
      average: agg.count > 0 ? agg.total / agg.count : 0,
      paidCount: agg.paidCount,
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  // ------------------------------------------------------------------
  // Fetch all data for the selected date range (with high limit)
  // ------------------------------------------------------------------
  const fetchAllSales = useCallback(async () => {
    setLoadingStats(true);
    setLoadingChart(true);
    setLoadingTable(true);
    setError(null);
    try {
      const res = await dailySalesAPI.getData({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        paymentMethod: paymentMethod || undefined,
        status: status || undefined,
        limit: 10000, // fetch many to aggregate client-side
      });

      if (!res.status) throw new Error(res.message);

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

      // Chart data
      setChartData(daily.map(d => ({ date: d.date, total: d.total, count: d.count })));

      // Table data (pagination handled client-side)
      setTotal(daily.length);
      setTotalPages(Math.ceil(daily.length / limit));
      const startIdx = (page - 1) * limit;
      setTableData(daily.slice(startIdx, startIdx + limit));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingStats(false);
      setLoadingChart(false);
      setLoadingTable(false);
    }
  }, [startDate, endDate, paymentMethod, status, page, limit]);

  useEffect(() => {
    fetchAllSales();
  }, [fetchAllSales]);

  const handleFilterChange = (filters: any) => {
    setStartDate(filters.startDate);
    setEndDate(filters.endDate);
    setPaymentMethod(filters.paymentMethod);
    setStatus(filters.status);
    setPage(1);
  };

  // ------------------------------------------------------------------
  // Export CSV from all fetched data (using the most recent fetch)
  // ------------------------------------------------------------------
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await dailySalesAPI.getData({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        paymentMethod: paymentMethod || undefined,
        status: status || undefined,
        limit: 10000,
      });
      if (res.status) {
        const daily = aggregateByDate(res.data.sales);
        const headers = ['Date', 'Transactions', 'Total Amount', 'Average', 'Paid Transactions'];
        const csvRows = daily.map(d => [
          d.date,
          d.count,
          d.total,
          d.average.toFixed(2),
          d.paidCount,
        ].join(','));
        const csv = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily_sales_${startDate || 'all'}_${endDate || 'all'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('No data to export');
      }
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[var(--background-color)] min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Daily Sales</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue-hover)] transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <FilterBar
        startDate={startDate}
        endDate={endDate}
        paymentMethod={paymentMethod}
        status={status}
        onFilterChange={handleFilterChange}
      />

      {error && (
        <div className="bg-[var(--danger-bg)] text-[var(--danger-color)] p-4 rounded-lg border border-[var(--danger-border)]">
          Error: {error}
        </div>
      )}

      <SummaryCards stats={stats} loading={loadingStats} />
      <SalesChart data={chartData} loading={loadingChart} />
      <SalesTable
        data={tableData}
        loading={loadingTable}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
};

export default DailySalesPage;