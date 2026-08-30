// src/renderer/pages/Analytics/FinancialReports/index.tsx
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useFinancialReports } from './hooks/useFinancialReports';
import { useFinancialFilters } from './hooks/useFinancialFilters';
import FilterBar from './components/FilterBar';
import ExportButton from './components/ExportButton';
import RevenueBreakdown from './components/RevenueBreakdown';
import ProfitLossChart from './components/ProfitLossChart';
import SummaryCards from './components/SummaryCards';

const FinancialReportsPage: React.FC = () => {
  const { filters, updateFilters, resetFilters, hasFilters } = useFinancialFilters();

  const {
    state: {
      summary,
      revenueBreakdown,
      profitLoss,
      loadingSummary,
      loadingRevenue,
      loadingProfit,
      error,
    },
    updateFilters: updateReportFilters,
    refetch,
  } = useFinancialReports({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    revenueGroupBy: filters.revenueGroupBy,
    profitGroupBy: filters.profitGroupBy,
  });

  const handleFilterChange = (newFilters: any) => {
    updateFilters(newFilters);
    updateReportFilters({
      startDate: newFilters.startDate || undefined,
      endDate: newFilters.endDate || undefined,
      revenueGroupBy: newFilters.revenueGroupBy,
      profitGroupBy: newFilters.profitGroupBy,
    });
  };

  const handleRefresh = () => {
    refetch();
  };

  const anyLoading = loadingSummary || loadingRevenue || loadingProfit;

  return (
    <div className="p-6 space-y-6 bg-[var(--background-color)] min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">💰</span>
            Financial Reports
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Analyze revenue, profit, and financial performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={anyLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--card-bg)] text-[var(--text-secondary)] rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${anyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <ExportButton startDate={filters.startDate} endDate={filters.endDate} />
        </div>
      </div>

      <FilterBar
        startDate={filters.startDate}
        endDate={filters.endDate}
        revenueGroupBy={filters.revenueGroupBy}
        profitGroupBy={filters.profitGroupBy}
        hasFilters={hasFilters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
      />

      {error && (
        <div className="bg-[var(--status-cancelled-bg)] border border-[var(--accent-red)] text-[var(--accent-red)] p-4 rounded-xl">
          Error: {error}
          <button onClick={handleRefresh} className="ml-3 underline hover:text-[var(--accent-red)]">
            Retry
          </button>
        </div>
      )}

      <SummaryCards summary={summary} loading={loadingSummary} />

      <RevenueBreakdown
        data={revenueBreakdown}
        groupBy={filters.revenueGroupBy}
        loading={loadingRevenue}
      />

      <ProfitLossChart
        data={profitLoss}
        groupBy={filters.profitGroupBy}
        loading={loadingProfit}
      />
    </div>
  );
};

export default FinancialReportsPage;