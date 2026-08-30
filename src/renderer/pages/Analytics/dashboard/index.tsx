// src/renderer/pages/Dashboard/index.tsx
import React from 'react';
import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import useDashboardData from './hooks/useDashboardData';
import SummaryCards from './components/SummaryCards';
import SalesChart from './components/SalesChart';
import LowStockTable from './components/LowStockTable';
import ActivityTimeline from './components/ActivityTimeline';
import TopProductsTable from './components/TopProductsTable';
import CustomerStats from './components/CustomerStats';
import AnalyticsQuickLinks from './components/AnalyticsQuickLinks';
import ExpiryAlert from './components/ExpiryAlert';

const DashboardPage: React.FC = () => {
  const {
    summary,
    salesChart,
    lowStockItems,
    recentActivities,
    topProducts,
    customerStats,
    expiringBatches,
    loading,
    error,
    chartPeriod,
    onPeriodChange,
    refetch,
  } = useDashboardData();

  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  const anyLoading = Object.values(loading).some(v => v);

  return (
    <div className="p-6 space-y-6 bg-[var(--background-color)] min-h-screen">
      {/* Header with gold accent */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">🏠</span>
            Dashboard
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-full bg-[var(--accent-gold-light)] text-[var(--accent-gold)] text-sm font-medium border border-[var(--accent-gold)]/20">
            🥩 Meatify POS
          </div>
          <button
            onClick={refetch}
            disabled={anyLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--card-bg)] text-[var(--text-secondary)] rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${anyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-[var(--status-cancelled-bg)] border border-[var(--accent-red)] text-[var(--accent-red)] p-4 rounded-xl">
          Error: {error}
          <button onClick={refetch} className="ml-3 underline hover:text-[var(--accent-red)]">
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <SummaryCards summary={summary} isLoading={loading.summary} />

      {/* Expiry Alert */}
      <ExpiryAlert batches={expiringBatches} isLoading={loading.expiry} />

      {/* Analytics Quick Links */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 rounded-full bg-[var(--accent-gold)]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Quick Analytics</h2>
        </div>
        <AnalyticsQuickLinks />
      </div>

      {/* Chart + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart
            data={salesChart}
            period={chartPeriod}
            onPeriodChange={onPeriodChange}
            isLoading={loading.chart}
          />
        </div>
        <div>
          <LowStockTable items={lowStockItems} isLoading={loading.lowStock} />
        </div>
      </div>

      {/* Bottom row: Activities, Top Products, Customer Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ActivityTimeline activities={recentActivities} isLoading={loading.activities} />
        <TopProductsTable products={topProducts} isLoading={loading.topProducts} />
        <CustomerStats stats={customerStats} isLoading={loading.customerStats} />
      </div>
    </div>
  );
};

export default DashboardPage;