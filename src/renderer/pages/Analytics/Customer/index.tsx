// src/renderer/pages/Analytics/Customer/index.tsx
import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useCustomerInsights } from './hooks/useCustomerInsights';
import SummaryCards from './components/SummaryCards';
import TopSpendersTable from './components/TopSpendersTable';
import TopLoyaltyTable from './components/TopLoyaltyTable';
import SegmentationPieChart from './components/SegmentationPieChart';
import CustomerTable from './components/CustomerTable';

const CustomerInsightsPage: React.FC = () => {
  // Unified state – filters and page
  const [filters, setFilters] = useState({
    search: '',
    minPoints: undefined as number | undefined,
    maxPoints: undefined as number | undefined,
    hasLoyaltyPoints: false,
    page: 1,
    limit: 10,
  });

  const {
    state: {
      summary,
      topSpenders,
      topLoyalty,
      segmentation,
      customers,
      total,
      totalPages,
      loadingSummary,
      loadingTopSpenders,
      loadingTopLoyalty,
      loadingTable,
      error,
      page,
    },
    updateFilters,
    refetch,
  } = useCustomerInsights(filters);

  const handleFilterChange = (newFilters: any) => {
    // Merge with existing filters
    setFilters((prev) => ({ ...prev, ...newFilters, page: newFilters.page ?? 1 }));
    // The hook's updateFilters will automatically re-fetch
    updateFilters(newFilters);
  };

  const handlePageChange = (newPage: number) => {
    handleFilterChange({ page: newPage });
  };

  const handleRefresh = () => {
    refetch();
  };

  const anyLoading = loadingSummary || loadingTopSpenders || loadingTopLoyalty || loadingTable;

  return (
    <div className="p-6 space-y-6 bg-[var(--background-color)] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">👥</span>
            Customer Insights
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Analyze customer behavior, loyalty, and spending patterns
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
        </div>
      </div>

      {error && (
        <div className="bg-[var(--status-cancelled-bg)] border border-[var(--accent-red)] text-[var(--accent-red)] p-4 rounded-xl flex items-center justify-between">
          <span>Error: {error}</span>
          <button onClick={handleRefresh} className="underline hover:text-[var(--accent-red-hover)]">
            Retry
          </button>
        </div>
      )}

      {summary && <SummaryCards summary={summary} isLoading={loadingSummary} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TopSpendersTable data={topSpenders} isLoading={loadingTopSpenders} />
          <TopLoyaltyTable data={topLoyalty} isLoading={loadingTopLoyalty} />
        </div>
        <div>
          {segmentation && <SegmentationPieChart segmentation={segmentation} isLoading={loadingSummary} />}
        </div>
      </div>

      <CustomerTable
        customers={customers}
        loading={loadingTable}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={handlePageChange}
        onFilterChange={handleFilterChange}
        filters={{
          search: filters.search,
          minPoints: filters.minPoints,
          maxPoints: filters.maxPoints,
          hasLoyaltyPoints: filters.hasLoyaltyPoints,
        }}
      />
    </div>
  );
};

export default CustomerInsightsPage;