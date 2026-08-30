// src/renderer/pages/inventory/batches/index.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useBatches, type BatchFilters } from "./hooks/useBatches";
import { BatchTable } from "./components/BatchTable";
import { FilterBar } from "./components/FilterBar";
import { BatchFormDialog } from "./components/BatchFormDialog";
import { BatchViewDialog } from "./components/BatchViewDialog";
import { SummaryCards } from "./components/SummaryCards";
import BulkActionsBar from "./components/BulkActionsBar";
import { usePagination } from "../../contexts/PaginationContext";
import batchAPI, { type Batch } from "../../api/core/batch";
import { dialogs } from "../../utils/dialogs";

const BatchesPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    batches,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    page,
    limit,
    stats,
    reload,
    fetchStats,
    goToPage,
    changeLimit,
    resetFilters,
  } = useBatches({
    search: "",
    status: "",
    meatId: undefined,
    supplierId: undefined,
  });

  const [showStats, setShowStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);

  // Dialog states
  const [formDialog, setFormDialog] = useState<{
    isOpen: boolean;
    batch: Batch | null;
  }>({ isOpen: false, batch: null });

  const [viewDialog, setViewDialog] = useState<{
    isOpen: boolean;
    batch: Batch | null;
  }>({ isOpen: false, batch: null });

  const hasFilters = !!(
    filters.search ||
    filters.status ||
    filters.meatId ||
    filters.supplierId ||
    filters.expiryDateFrom ||
    filters.expiryDateTo ||
    filters.minRemaining ||
    filters.maxRemaining
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
  const handleFilterChange = useCallback(
    <K extends keyof BatchFilters>(key: K, value: BatchFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters]
  );

  // ─── CRUD Handlers ──────────────────────────────────────────────
  const handleCreate = () => {
    setFormDialog({ isOpen: true, batch: null });
  };

  const handleEdit = (batch: Batch) => {
    setFormDialog({ isOpen: true, batch });
  };

  const handleView = (batch: Batch) => {
    setViewDialog({ isOpen: true, batch });
  };

  const handleDelete = async (batch: Batch) => {
    const confirmed = await dialogs.confirm({
      title: "Delete Batch",
      message: `Are you sure you want to delete batch "${batch.batchCode}"? This action cannot be undone.`,
      confirmText: "Delete",
      icon: "danger",
    });
    if (!confirmed) return;

    try {
      await batchAPI.delete(batch.id);
      dialogs.success(`Batch ${batch.batchCode} deleted successfully.`);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Failed to delete batch.");
    }
  };

  const handleToggleStatus = async (batch: Batch) => {
    const newStatus = batch.status === "active" ? "on_hold" : "active";
    const action = newStatus === "active" ? "activate" : "put on hold";
    const confirmed = await dialogs.confirm({
      title: newStatus === "active" ? "Activate Batch" : "Put Batch On Hold",
      message: `Are you sure you want to ${action} batch "${batch.batchCode}"?`,
      confirmText: newStatus === "active" ? "Activate" : "Hold",
      icon: "warning",
    });
    if (!confirmed) return;

    try {
      await batchAPI.update(batch.id, { status: newStatus as any });
      dialogs.success(`Batch ${batch.batchCode} ${action}d successfully.`);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || `Failed to ${action} batch.`);
    }
  };

  const handleFormSuccess = () => {
    setFormDialog({ isOpen: false, batch: null });
    reload({ page, limit });
  };

  const handleViewClose = () => {
    setViewDialog({ isOpen: false, batch: null });
  };

  // ─── Bulk Actions ───────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Delete",
      message: `Delete ${selectedIds.length} selected batch(es)? This action cannot be undone.`,
      confirmText: "Delete All",
      icon: "danger",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => batchAPI.delete(id)));
      dialogs.success(`${selectedIds.length} batch(es) deleted.`);
      setSelectedIds([]);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Bulk delete failed.");
    }
  };

  const handleBulkExport = () => {
    const selectedBatches = batches.filter((b) => selectedIds.includes(b.id));
    if (selectedBatches.length === 0) {
      dialogs.warning("No items selected for export.");
      return;
    }
    const headers = ["ID", "Batch Code", "Meat", "Supplier", "Status", "Remaining", "Expiry Date"];
    const rows = selectedBatches.map((b) => [
      b.id,
      b.batchCode,
      b.meat?.name || "",
      b.supplier?.name || "",
      b.status,
      b.remainingQuantity,
      new Date(b.expiryDate).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_batches_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dialogs.success("Export completed.");
  };

  const handleClearSelection = () => setSelectedIds([]);

  // ─── Full Export ────────────────────────────────────────────────
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const response = await batchAPI.export({
        format: "csv",
        filters: {
          search: filters.search || undefined,
          status: filters.status || undefined,
          meatId: filters.meatId,
          supplierId: filters.supplierId,
          expiryDateFrom: filters.expiryDateFrom,
          expiryDateTo: filters.expiryDateTo,
          minRemaining: filters.minRemaining,
          maxRemaining: filters.maxRemaining,
        },
      });
      if (response.status && response.data) {
        const blob = new Blob([response.data.data as string], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = response.data.filename || `batches_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        dialogs.success("Export completed.");
      }
    } catch (err: any) {
      dialogs.error(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">📦</span>
            Batch Management
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Manage inventory batches, track stock, and monitor expiry dates
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors"
            title={showStats ? "Hide summary" : "Show summary"}
          >
            {showStats ? (
              <EyeOff style={{ color: "var(--text-primary)" }} className="w-4 h-4" />
            ) : (
              <Eye style={{ color: "var(--text-primary)" }} className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors"
            title={showFilters ? "Hide filters" : "Show filters"}
          >
            <Filter
              className="w-4 h-4"
              style={{ color: "var(--text-primary)" }}
            />
          </button>
          <button
            onClick={handleExportAll}
            disabled={exporting || batches.length === 0}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors disabled:opacity-50"
            title="Export all (current filters)"
          >
            <Download style={{ color: "var(--text-primary)" }}
              className={`w-4 h-4 ${exporting ? "animate-pulse" : ""}`}
            />
          </button>
          <button
            onClick={() => {
              reload({ page, limit });
            }}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw style={{ color: "var(--text-primary)" }} className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors shadow-md font-medium"
          >
            <Plus className="w-4 h-4" />
            New Batch
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {showStats && stats && (
        <SummaryCards statistics={stats} loading={loading} />
      )}

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
          onDelete={handleBulkDelete}
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
          <p className="text-[var(--text-primary)] font-medium">Error loading batches</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
          <button
            onClick={() => reload({ page: 1, limit })}
            className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <BatchTable
          batches={batches}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          selectedIds={selectedIds}
          onSelectRow={(id, checked) => {
            setSelectedIds((prev) =>
              checked ? [...prev, id] : prev.filter((i) => i !== id)
            );
          }}
          onSelectAll={(checked) => {
            setSelectedIds(checked ? batches.map((b) => b.id) : []);
          }}
        />
      )}

      {/* Dialogs */}
      <BatchFormDialog
        isOpen={formDialog.isOpen}
        batch={formDialog.batch}
        onClose={() => setFormDialog({ isOpen: false, batch: null })}
        onSuccess={handleFormSuccess}
      />

      <BatchViewDialog
        isOpen={viewDialog.isOpen}
        batch={viewDialog.batch}
        onClose={handleViewClose}
      />
    </div>
  );
};

export default BatchesPage;