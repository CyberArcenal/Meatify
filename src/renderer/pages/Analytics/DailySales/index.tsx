// src/renderer/pages/Analytics/DailySales/index.tsx
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useDailySales } from './hooks/useDailySales';
import { useDailySalesFilters } from './hooks/useDailySalesFilters';
import FilterBar from './components/FilterBar';
import ExportButton from './components/ExportButton';
import SummaryCards from './components/SummaryCards';
import SalesChart from './components/SalesChart';
import SalesTable from './components/SalesTable';

const DailySalesPage: React.FC = () => {
  const { filters, updateFilters, resetFilters, hasFilters } = useDailySalesFilters();

  const {
    state: {
      stats,
      chartData,
      tableData,
      total,
      totalPages,
      loadingStats,
      loadingChart,
      loadingTable,
      error,
      page,
    },
    updateFilters: updateReportFilters,
    refetch,
  } = useDailySales({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    paymentMethod: filters.paymentMethod || undefined,
    status: filters.status || undefined,
    page: 1,
    limit: 10,
  });

  const handleFilterChange = (newFilters: any) => {
    updateFilters(newFilters);
    updateReportFilters({
      startDate: newFilters.startDate || undefined,
      endDate: newFilters.endDate || undefined,
      paymentMethod: newFilters.paymentMethod || undefined,
      status: newFilters.status || undefined,
      page: 1,
    });
  };

  const handlePageChange = (newPage: number) => {
    updateReportFilters({ page: newPage });
  };

  const handleRefresh = () => {
    refetch();
  };

  const anyLoading = loadingStats || loadingChart || loadingTable;

  return (
    <div className="p-6 space-y-6 bg-[var(--background-color)] min-h-screen">
      {/* Header with gold accent */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">📅</span>
            Daily Sales
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Monitor daily sales performance and trends
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
          <ExportButton
            startDate={filters.startDate}
            endDate={filters.endDate}
            paymentMethod={filters.paymentMethod}
            status={filters.status}
          />
        </div>
      </div>

      <FilterBar
        startDate={filters.startDate}
        endDate={filters.endDate}
        paymentMethod={filters.paymentMethod}
        status={filters.status}
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

      <SummaryCards stats={stats} loading={loadingStats} />

      <SalesChart data={chartData} loading={loadingChart} />

      <SalesTable
        data={tableData}
        loading={loadingTable}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={handlePageChange}
        onViewDate={(date) => {
          // This will be handled inside SalesTable component
          // The table component will fetch details for the selected date
        }}
      />
    </div>
  );
};

export default DailySalesPage;