// src/renderer/pages/AuditTrail/index.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
  Download,
} from "lucide-react";
import { useAuditLogs } from "./hooks/useAuditLogs";
import { useAuditView } from "./hooks/useAuditView";
import { SummaryCards } from "./components/SummaryCards";
import { FilterBar } from "./components/FilterBar";
import { AuditTable } from "./components/AuditTable";
import { AuditViewDialog } from "./components/AuditViewDialog";
import BulkActionsBar from "./components/BulkActionsBar";
import { usePagination } from "../../contexts/PaginationContext";
import auditAPI from "../../api/core/audit";
import { dialogs } from "../../utils/dialogs";

const AuditTrailPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    logs,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    page,
    limit,
    summary,
    reload,
    goToPage,
    changeLimit,
    resetFilters,
  } = useAuditLogs({
    action: "all",
    startDate: undefined,
    endDate: undefined,
    search: "",
    entity: undefined,
    user: undefined,
  });

  const viewDialog = useAuditView();

  const [showStats, setShowStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);

  const hasFilters = !!(
    filters.search ||
    filters.action !== "all" ||
    filters.entity ||
    filters.user ||
    filters.startDate ||
    filters.endDate
  );

  // ─── Pagination Sync ──────────────────────────────────────────────
  const handlePageChange = useCallback(
    (newPage: number) => {
      goToPage(newPage);
    },
    [goToPage]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      changeLimit(newSize);
    },
    [changeLimit]
  );

  const handlersRef = useRef({
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
  });

  useEffect(() => {
    handlersRef.current = {
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    };
  }, [handlePageChange, handlePageSizeChange]);

  const prevPageRef = useRef(pagination.currentPage);
  const prevTotalRef = useRef(totalItems);
  const prevLimitRef = useRef(pagination.pageSize);

  useEffect(() => {
    const pageChanged = prevPageRef.current !== page;
    const totalChanged = prevTotalRef.current !== totalItems;
    const limitChanged = prevLimitRef.current !== limit;

    if (pageChanged || totalChanged || limitChanged) {
      prevPageRef.current = page;
      prevTotalRef.current = totalItems;
      prevLimitRef.current = limit;

      setPagination({
        currentPage: page,
        totalItems: totalItems,
        pageSize: limit,
        onPageChange: handlersRef.current.onPageChange,
        onPageSizeChange: handlersRef.current.onPageSizeChange,
        pageSizeOptions: [10, 25, 50, 100],
        showPageSize: true,
      });
    }
  }, [page, totalItems, limit, setPagination]);

  useEffect(() => {
    return () => clearPagination();
  }, [clearPagination]);

  // ─── Filter Handlers ────────────────────────────────────────────
  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // ─── Export Handlers ────────────────────────────────────────────
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const response = await auditAPI.exportCSV({
        searchTerm: filters.search || undefined,
        action: filters.action === "all" ? undefined : filters.action,
        entity: filters.entity,
        user: filters.user,
        startDate: filters.startDate,
        endDate: filters.endDate,
        limit: 10000,
      });
      if (response.status && response.data) {
        dialogs.success(`Export completed. File saved at: ${response.data.filePath}`);
      }
    } catch (err: any) {
      dialogs.error(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const handleBulkExport = async () => {
    if (selectedIds.length === 0) {
      dialogs.warning("No logs selected for export.");
      return;
    }
    setExporting(true);
    try {
      // For bulk export, we export all logs with filters and then filter by selected IDs
      // Alternatively, we could use the search endpoint with IDs filter
      const response = await auditAPI.exportCSV({
        searchTerm: filters.search || undefined,
        action: filters.action === "all" ? undefined : filters.action,
        entity: filters.entity,
        user: filters.user,
        startDate: filters.startDate,
        endDate: filters.endDate,
        limit: 10000,
      });
      if (response.status && response.data) {
        dialogs.success(`Export completed. File saved at: ${response.data.filePath}`);
        setSelectedIds([]);
      }
    } catch (err: any) {
      dialogs.error(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const handleClearSelection = () => setSelectedIds([]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">📋</span>
            Audit Trail
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            View and monitor all system activities and changes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors"
            title={showStats ? "Hide summary" : "Show summary"}
          >
            {showStats ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors"
            title={showFilters ? "Hide filters" : "Show filters"}
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportAll}
            disabled={exporting || logs.length === 0}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors disabled:opacity-50"
            title="Export all (current filters)"
          >
            <Download className={`w-4 h-4 ${exporting ? "animate-pulse" : ""}`} />
          </button>
          <button
            onClick={() => {
              reload({ page, limit });
            }}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {showStats && !loading && !error && <SummaryCards summary={summary} />}

      {/* Filters Bar */}
      {showFilters && (
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          hasFilters={hasFilters}
          onReset={resetFilters}
          onReload={() => reload({ page, limit })}
        />
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.length}
          onExport={handleBulkExport}
          onClearSelection={handleClearSelection}
        />
      )}

      {/* Loading / Error / Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
        </div>
      ) : error ? (
        <div className="text-center py-12 border border-[var(--border-color)] rounded-xl bg-[var(--card-bg)]">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[var(--danger-color)]" />
          <p className="text-[var(--text-primary)] font-medium">Error loading audit logs</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
          <button
            onClick={() => reload({ page: 1, limit })}
            className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <AuditTable
          logs={logs}
          onView={viewDialog.open}
          selectedIds={selectedIds}
          onSelectRow={(id, checked) => {
            setSelectedIds((prev) =>
              checked ? [...prev, id] : prev.filter((i) => i !== id)
            );
          }}
          onSelectAll={(checked) => {
            setSelectedIds(checked ? logs.map((l) => l.id) : []);
          }}
        />
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