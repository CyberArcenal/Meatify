// src/renderer/pages/Loyalty/index.tsx
import React, { useEffect } from "react";
import { Loader2, AlertCircle, Plus } from "lucide-react";
import { useLoyalty, type LoyaltyFilters } from "./hooks/useLoyalty";
import { LoyaltyOverview } from "./components/LoyaltyOverview";
import { useLoyaltyAdjustment } from "./hooks/useLoyaltyAdjustment";
import { useCustomerLoyaltyView } from "./hooks/useCustomerLoyaltyView";
import { LoyaltyTransactionsTable } from "./components/LoyaltyTransactionsTable";
import { LoyaltyAnalytics } from "./components/LoyaltyAnalytics";
import { LoyaltyAdjustmentDialog } from "./components/LoyaltyAdjustmentDialog";
import { CustomerLoyaltyViewDialog } from "./components/CustomerLoyaltyViewDialog";
import { usePagination } from "../../contexts/PaginationContext";

const CustomerLoyaltyPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();
  const {
    transactions,
    statistics,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    reload,
    topCustomers,
    pointsDistribution,
    monthlyTrends,
  } = useLoyalty({
    type: "all",
    customerId: undefined,
    startDate: undefined,
    endDate: undefined,
    search: "",
  });

  const adjustmentDialog = useLoyaltyAdjustment();
  const viewDialog = useCustomerLoyaltyView();

  // Sync with global pagination
  useEffect(() => {
    setPagination({
      currentPage: pagination.currentPage,
      totalItems: totalItems,
      pageSize: pagination.pageSize,
      onPageChange: (page) => {
        reload({ page, limit: pagination.pageSize });
      },
      onPageSizeChange: (size) => {
        reload({ page: 1, limit: size });
      },
      pageSizeOptions: [10, 20, 50, 100],
      showPageSize: true,
    });

    return () => clearPagination();
  }, [totalItems, pagination.currentPage, pagination.pageSize]);

  const handleFilterChange = (key: keyof LoyaltyFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    reload({ page: 1, limit: pagination.pageSize });
  };

  return (
    <div className="h-full flex flex-col bg-[var(--card-bg)] p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-gold-hover)] bg-clip-text text-transparent">
          Loyalty Program Management
        </h1>
        <button
          onClick={adjustmentDialog.open}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          Adjust Points
        </button>
      </div>

      {/* Overview Cards */}
      {!loading && !error && statistics && (
        <LoyaltyOverview statistics={statistics} />
      )}

      {/* Filters */}
      <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-lg p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by customer name..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
          >
            <option value="all">All Transactions</option>
            <option value="earn">Earned Only</option>
            <option value="redeem">Redeemed Only</option>
          </select>

          {/* Date Range */}
          <input
            type="date"
            value={filters.startDate || ""}
            onChange={(e) =>
              handleFilterChange("startDate", e.target.value || undefined)
            }
            className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
          />
          <span className="text-[var(--text-tertiary)]">to</span>
          <input
            type="date"
            value={filters.endDate || ""}
            onChange={(e) =>
              handleFilterChange("endDate", e.target.value || undefined)
            }
            className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none"
          />

          {/* Reload */}
          <button
            onClick={() => reload({ page: pagination.currentPage, limit: pagination.pageSize })}
            className="px-4 py-2 bg-[var(--card-hover-bg)] rounded-lg hover:bg-[var(--border-color)] transition-colors text-[var(--text-secondary)]"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[var(--accent-red)]" />
            <p className="text-[var(--text-primary)] font-medium">
              Error loading loyalty data
            </p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
            <button
              onClick={() => reload({ page: 1, limit: pagination.pageSize })}
              className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Transactions Table */}
          <div className="flex-1">
            <LoyaltyTransactionsTable
              transactions={transactions}
              onViewCustomer={viewDialog.open}
            />
          </div>

          {/* Pagination is handled by Layout via global context */}

          {/* Analytics Section */}
          <div className="mt-8">
            <LoyaltyAnalytics
              pointsDistribution={pointsDistribution}
              monthlyTrends={monthlyTrends}
              topCustomers={topCustomers}
            />
          </div>
        </>
      )}

      {/* Dialogs */}
      <LoyaltyAdjustmentDialog
        isOpen={adjustmentDialog.isOpen}
        onClose={adjustmentDialog.close}
        onSuccess={() => {
          adjustmentDialog.close();
          reload({ page: pagination.currentPage, limit: pagination.pageSize });
        }}
      />

      <CustomerLoyaltyViewDialog
        isOpen={viewDialog.isOpen}
        customer={viewDialog.customer}
        transactions={viewDialog.transactions}
        loading={viewDialog.loading}
        onClose={viewDialog.close}
      />
    </div>
  );
};

export default CustomerLoyaltyPage;