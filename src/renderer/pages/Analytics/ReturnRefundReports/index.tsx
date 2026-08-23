// src/renderer/pages/analytics/returns/index.tsx
import React, { useEffect, useState } from "react";
import { RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { useReturnRefunds } from "./hooks/useReturnRefunds";
import { usePagination } from "../../../contexts/PaginationContext";
import { FilterBar } from "./components/FilterBar";
import { SummaryCards } from "./components/SummaryCards";
import { StatsCards } from "./components/StatsCards";
import { ReturnsTable } from "./components/ReturnsTable";
import type { ReturnRefund } from "../../../api/core/returnRefund";
import { ReturnViewDialog } from "./components/ReturnViewDialog";

const ReturnRefundReportsPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    returns,
    loading,
    error,
    totalItems,
    filters,
    setFilters,
    reload,
    summary,
    stats,
  } = useReturnRefunds({
    search: "",
    status: "",
    refundMethod: "",
    startDate: undefined,
    endDate: undefined,
    customerId: undefined,
    sortBy: "createdAt",
    sortOrder: "DESC",
  });

  const [selectedReturn, setSelectedReturn] = useState<ReturnRefund | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

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

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    reload({ page: 1, limit: pagination.pageSize });
  };

  const handleRefresh = () => {
    reload({ page: pagination.currentPage, limit: pagination.pageSize });
  };

  const handleView = (returnRefund: ReturnRefund) => {
    setSelectedReturn(returnRefund);
    setViewDialogOpen(true);
  };

  const handleCloseView = () => {
    setViewDialogOpen(false);
    setSelectedReturn(null);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--card-bg)] p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-gold-hover)] bg-clip-text text-transparent">
            Returns & Refunds Report
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {totalItems} total return transactions
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--card-secondary-bg)] rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)] border border-[var(--border-color)] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {!loading && !error && <SummaryCards summary={summary} />}

      {/* Stats Cards */}
      {!loading && !error && <StatsCards stats={stats} />}

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4 text-red-400">
          {error}
          <button
            onClick={() => reload({ page: 1, limit: pagination.pageSize })}
            className="ml-3 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
        </div>
      ) : (
        <div className="flex-1 mt-4">
          <ReturnsTable
            returns={returns}
            onView={handleView}
          />
        </div>
      )}

      {/* View Dialog */}
      <ReturnViewDialog
        isOpen={viewDialogOpen}
        returnRefund={selectedReturn}
        onClose={handleCloseView}
      />
    </div>
  );
};

export default ReturnRefundReportsPage;