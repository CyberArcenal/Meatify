// src/renderer/pages/Analytics/InventoryReports/index.tsx
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useInventoryReports } from './hooks/useInventoryReports';
import { useInventoryFilters } from './hooks/useInventoryFilters';
import FilterBar from './components/FilterBar';
import ExportButton from './components/ExportButton';
import LowStockTable from './components/LowStockTable';
import SummaryCards from './components/SummaryCards';
import OutOfStockTable from './components/OutOfStockTable';
import StatsCards from './components/StatsCards';
import MovementsTable from './components/MovementsTable';

const InventoryReportsPage: React.FC = () => {
  const { filters, updateFilters, resetFilters, hasFilters } = useInventoryFilters();

  const {
    state: {
      summary,
      lowStock,
      outOfStock,
      movements,
      stats,
      topValueItems,
      categorySummary,
      supplierSummary,
      loadingSummary,
      loadingMovements,
      error,
    },
    updateFilters: updateReportFilters,
    refetch,
  } = useInventoryReports({
    categoryId: filters.categoryId,
    supplierId: filters.supplierId,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  });

  const handleFilterChange = (newFilters: any) => {
    updateFilters(newFilters);
    updateReportFilters({
      categoryId: newFilters.categoryId ? Number(newFilters.categoryId) : undefined,
      supplierId: newFilters.supplierId ? Number(newFilters.supplierId) : undefined,
      startDate: newFilters.startDate || undefined,
      endDate: newFilters.endDate || undefined,
    });
  };

  const handleRefresh = () => {
    refetch();
  };

  const anyLoading = loadingSummary || loadingMovements;

  return (
    <div className="p-6 space-y-6 bg-[var(--background-color)] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">📦</span>
            Inventory Reports
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Monitor stock levels, values, and movement history
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
            categoryId={filters.categoryId}
            supplierId={filters.supplierId}
            startDate={filters.startDate}
            endDate={filters.endDate}
          />
        </div>
      </div>

      <FilterBar
        categoryId={filters.categoryId}
        supplierId={filters.supplierId}
        startDate={filters.startDate}
        endDate={filters.endDate}
        hasFilters={hasFilters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
      />

      {error && (
        <div className="bg-[var(--status-cancelled-bg)] border border-[var(--accent-red)] text-[var(--accent-red)] p-4 rounded-xl">
          Error: {error}
          <button
            onClick={handleRefresh}
            className="ml-3 underline hover:text-[var(--accent-red)]"
          >
            Retry
          </button>
        </div>
      )}

      <SummaryCards summary={summary} loading={loadingSummary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockTable data={lowStock} loading={loadingSummary} />
        <OutOfStockTable data={outOfStock} loading={loadingSummary} />
      </div>

      <StatsCards
        stats={stats}
        loading={loadingSummary}
        topValueItems={topValueItems}
        categorySummary={categorySummary}
        supplierSummary={supplierSummary}
      />

      <MovementsTable data={movements} loading={loadingMovements} />
    </div>
  );
};

export default InventoryReportsPage;