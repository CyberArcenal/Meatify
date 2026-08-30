// src/renderer/pages/Analytics/SalesReports/index.tsx
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useSalesReport } from './hooks/useSalesReport';
import { useSalesFilters } from './hooks/useSalesFilters';
import ExportButton from './components/ExportButton';
import FilterBar from './components/FilterBar';
import SummaryCards from './components/SummaryCards';
import StatsCards from './components/StatsCards';
import SalesTable from './components/SalesTable';

const SalesReportsPage: React.FC = () => {
  const { filters, updateFilters, resetFilters, hasFilters } = useSalesFilters();

  const {
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
      page,
    },
    updateFilters: updateReportFilters,
    refetch,
  } = useSalesReport({
    customerId: filters.customerId,
    status: filters.status || undefined,
    paymentMethod: filters.paymentMethod || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    searchTerm: filters.searchTerm || undefined,
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
    page: 1,
    limit: 10,
  });

  const handleFilterChange = (newFilters: any) => {
    updateFilters(newFilters);
    updateReportFilters({
      ...newFilters,
      page: 1,
      customerId: newFilters.customerId ? Number(newFilters.customerId) : undefined,
      minAmount: newFilters.minAmount ? Number(newFilters.minAmount) : undefined,
      maxAmount: newFilters.maxAmount ? Number(newFilters.maxAmount) : undefined,
    });
  };

  const handlePageChange = (newPage: number) => {
    updateReportFilters({ page: newPage });
  };

  const handleRefresh = () => {
    refetch();
  };

  const anyLoading = loadingSummary || loadingSales;

  return (
    <div className="p-6 space-y-6 bg-[var(--background-color)] min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">📊</span>
            Sales Report
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Monitor sales performance, trends, and customer insights
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
            customerId={filters.customerId}
            status={filters.status}
            paymentMethod={filters.paymentMethod}
            startDate={filters.startDate}
            endDate={filters.endDate}
            minAmount={filters.minAmount}
            maxAmount={filters.maxAmount}
            searchTerm={filters.searchTerm}
          />
        </div>
      </div>

      <FilterBar
        customerId={filters.customerId}
        status={filters.status}
        paymentMethod={filters.paymentMethod}
        startDate={filters.startDate}
        endDate={filters.endDate}
        searchTerm={filters.searchTerm}
        minAmount={filters.minAmount}
        maxAmount={filters.maxAmount}
        onFilterChange={handleFilterChange}
      />

      {error && (
        <div className="bg-[var(--status-cancelled-bg)] border border-[var(--accent-red)] text-[var(--accent-red)] p-4 rounded-xl">
          Error: {error}
        </div>
      )}

      <SummaryCards summary={summary} loading={loadingSummary} />

      <StatsCards
        topProducts={productBreakdown.slice(0, 5)}
        topCustomers={customerBreakdown.slice(0, 5)}
        hourlyData={dailyTrend.slice(0, 12)}
        loading={loadingSales}
      />

      <SalesTable
        data={sales}
        loading={loadingSales}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default SalesReportsPage;