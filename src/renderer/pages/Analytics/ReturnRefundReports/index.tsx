// src/renderer/pages/analytics/returns/index.tsx
import React, { useEffect, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { useReturnRefunds } from "./hooks/useReturnRefunds";
import { usePagination } from "../../../contexts/PaginationContext";
import { FilterBar } from "./components/FilterBar";
import { SummaryCards } from "./components/SummaryCards";
import { StatsCards } from "./components/StatsCards";
import { ReturnsTable } from "./components/ReturnsTable";
import type { ReturnRefundReport } from "../../../api/analytics/returnRefundReports";
import { ReturnViewDialog } from "./components/ReturnViewDialog";
import ExportButton from "./components/ExportButton";

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
    page,
    limit,
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

  const [selectedReturn, setSelectedReturn] = useState<ReturnRefundReport | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Sync with global pagination
  useEffect(() => {
    setPagination({
      currentPage: page,
      totalItems: totalItems,
      pageSize: limit,
      onPageChange: (newPage) => {
        reload({ page: newPage, limit });
      },
      onPageSizeChange: (newSize) => {
        reload({ page: 1, limit: newSize });
      },
      pageSizeOptions: [10, 20, 50, 100],
      showPageSize: true,
    });

    return () => clearPagination();
  }, [totalItems, page, limit, reload, setPagination, clearPagination]);

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters({ [key]: value });
  };

  const handleRefresh = () => {
    reload({ page, limit });
  };

  const handleView = (returnRefund: ReturnRefundReport) => {
    setSelectedReturn(returnRefund);
    setViewDialogOpen(true);
  };

  const handleCloseView = () => {
    setViewDialogOpen(false);
    setSelectedReturn(null);
  };

  return (
    <div className="p-6 space-y-6 bg-[var(--background-color)] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">↩️</span>
            Returns & Refunds
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Monitor return transactions, refund amounts, and trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--card-bg)] text-[var(--text-secondary)] rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw style={{ color: "var(--text-primary)" }} className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <ExportButton
            customerId={filters.customerId}
            status={filters.status}
            refundMethod={filters.refundMethod}
            startDate={filters.startDate || ""}
            endDate={filters.endDate || ""}
            searchTerm={filters.search}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={summary} loading={loading} />

      {/* Stats Cards */}
      <StatsCards stats={stats} loading={loading} />

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-[var(--status-cancelled-bg)] border border-[var(--accent-red)] text-[var(--accent-red)] p-4 rounded-xl">
          Error: {error}
          <button
            onClick={() => reload({ page, limit })}
            className="ml-3 underline hover:text-[var(--accent-red)]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
        </div>
      ) : (
        <ReturnsTable returns={returns} onView={handleView} />
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