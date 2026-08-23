import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import type {
  FinancialSummary, // for display maybe not used
  FinancialData,
  FinancialPeriodData,
  TopProduct,
} from '../../../api/analytics/financialReports';
import FilterBar from './components/FilterBar';
import financialReportsAPI from '../../../api/analytics/financialReports';
import ExportButton from './components/ExportButton';
import RevenueBreakdown from './components/RevenueBreakdown';
import ProfitLossChart from './components/ProfitLossChart';
import SummaryCards from './components/SummaryCards';

// Local types based on API response
type RevenueBreakdownItem = {
  name: string;
  amount: number;
  count: number;
};

type ProfitLossItem = FinancialPeriodData;

const FinancialReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [revenueGroupBy, setRevenueGroupBy] = useState<'paymentMethod' | 'product'>('paymentMethod');
  const [profitGroupBy, setProfitGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdownItem[]>([]);
  const [profitLoss, setProfitLoss] = useState<ProfitLossItem[]>([]);
  const [loading, setLoading] = useState({
    summary: false,
    revenue: false,
    profit: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch all data using getData
  const fetchData = useCallback(async () => {
    setLoading({ summary: true, revenue: true, profit: true });
    setError(null);
    try {
      const res = await financialReportsAPI.getData({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        groupBy: profitGroupBy, // use same grouping for chart; could separate but we only have one
      });

      if (!res.status) throw new Error(res.message);

      const data = res.data as FinancialData;

      // Set summary
      setSummary(data.summary as unknown as FinancialSummary);

      // Revenue breakdown
      if (revenueGroupBy === 'paymentMethod') {
        const items: RevenueBreakdownItem[] = Object.entries(data.summary.paymentBreakdown).map(([name, total]) => ({
          name,
          amount: total,
          count: 0, // Not available from this API
        }));
        setRevenueBreakdown(items);
      } else {
        // product
        const items: RevenueBreakdownItem[] = data.summary.topProducts.map((p: TopProduct) => ({
          name: p.meatName,
          amount: p.totalRevenue,
          count: p.count,
        }));
        setRevenueBreakdown(items);
      }

      // Profit/Loss data
      setProfitLoss(data.groupedData as ProfitLossItem[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading({ summary: false, revenue: false, profit: false });
    }
  }, [startDate, endDate, revenueGroupBy, profitGroupBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  const handleFilterChange = (filters: any) => {
    setStartDate(filters.startDate);
    setEndDate(filters.endDate);
    setRevenueGroupBy(filters.revenueGroupBy);
    setProfitGroupBy(filters.profitGroupBy);
  };

  const anyLoading = Object.values(loading).some(v => v);

  return (
    <div className="p-6 space-y-6 bg-[var(--background-color)] min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Financial Reports</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={anyLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${anyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <ExportButton startDate={startDate} endDate={endDate} />
        </div>
      </div>

      <FilterBar
        startDate={startDate}
        endDate={endDate}
        revenueGroupBy={revenueGroupBy}
        profitGroupBy={profitGroupBy}
        onFilterChange={handleFilterChange}
      />

      {error && (
        <div className="bg-[var(--danger-bg)] text-[var(--danger-color)] p-4 rounded-lg border border-[var(--danger-border)]">
          Error: {error}
        </div>
      )}

      <SummaryCards summary={summary} loading={loading.summary} />

      <RevenueBreakdown data={revenueBreakdown} groupBy={revenueGroupBy} loading={loading.revenue} />

      <ProfitLossChart data={profitLoss} groupBy={profitGroupBy} loading={loading.profit} />
    </div>
  );
};

export default FinancialReportsPage;