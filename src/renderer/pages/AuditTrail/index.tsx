// src/renderer/pages/AuditTrail/index.tsx
import React, { useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuditLogs } from "./hooks/useAuditLogs";
import { useAuditView } from "./hooks/useAuditView";
import { SummaryCards } from "./components/SummaryCards";
import { FilterBar } from "./components/FilterBar";
import { AuditTable } from "./components/AuditTable";
import { AuditViewDialog } from "./components/AuditViewDialog";
import { usePagination } from "../../contexts/PaginationContext";

const AuditTrailPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();
  const { logs, filters, setFilters, loading, error, reload, summary, totalItems } =
    useAuditLogs({
      action: "all",
      startDate: undefined,
      endDate: undefined,
      search: "",
      entity: undefined,
      user: undefined,
    });

  const viewDialog = useAuditView();

  // Sync with global pagination
  useEffect(() => {
    setPagination({
      currentPage: pagination.currentPage,
      totalItems: totalItems,
      pageSize: pagination.pageSize,
      onPageChange: (page) => {
        // Fetch data when page changes
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

  // When filters change, reset to page 1
  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    // The reload will be triggered by the effect in useAuditLogs
  };

  return (
    <div className="h-full flex flex-col bg-[var(--card-bg)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-gold-hover)] bg-clip-text text-transparent">
          Audit Trail
        </h1>
      </div>

      {/* Summary Cards */}
      {!loading && !error && <SummaryCards summary={summary} />}

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReload={() => reload({ page: 1, limit: pagination.pageSize })}
      />

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
              Error loading audit logs
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
        <div className="flex-1">
          <AuditTable logs={logs} onView={viewDialog.open} />
        </div>
      )}

      {/* View Dialog */}
      <AuditViewDialog
        isOpen={viewDialog.isOpen}
        log={viewDialog.log}
        onClose={viewDialog.close}
      />
    </div>
  );
};

export default AuditTrailPage;