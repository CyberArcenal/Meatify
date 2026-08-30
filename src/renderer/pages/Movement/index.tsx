// src/renderer/pages/inventory/movements/index.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useMovements, type MovementFilters } from "./hooks/useMovements";
import { useMovementView } from "./hooks/useMovementView";
import { SummaryCards } from "./components/SummaryCards";
import { FilterBar } from "./components/FilterBar";
import { MovementTable } from "./components/MovementTable";
import { MovementViewDialog } from "./components/MovementViewDialog";
import BulkActionsBar from "./components/BulkActionsBar";
import { usePagination } from "../../contexts/PaginationContext";
import inventoryMovementAPI from "../../api/core/inventoryMovement";
import { dialogs } from "../../utils/dialogs";

const MovementPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    movements,
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
  } = useMovements({
    movementType: "all",
    startDate: undefined,
    endDate: undefined,
    search: "",
    direction: "all",
  });

  const viewDialog = useMovementView();

  const [showStats, setShowStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);

  const hasFilters = !!(
    filters.search ||
    filters.movementType !== "all" ||
    filters.direction !== "all" ||
    filters.startDate ||
    filters.endDate
  );

  // ─── Pagination Sync ──────────────────────────────────────────────
  const handlePageChange = useCallback(
    (newPage: number) => {
      goToPage(newPage);
    },
    [goToPage],
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      changeLimit(newSize);
    },
    [changeLimit],
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
    (key: keyof MovementFilters, value: any) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters],
  );

  // ─── Export ────────────────────────────────────────────────────
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const response = await inventoryMovementAPI.export({
        format: "csv",
        filters: {
          movementType:
            filters.movementType === "all" ? undefined : filters.movementType,
          startDate: filters.startDate,
          endDate: filters.endDate,
          search: filters.search || undefined,
          direction:
            filters.direction === "all" ? undefined : filters.direction,
        },
      });
      if (response.status && response.data) {
        const blob = new Blob([response.data.data as string], {
          type: "text/csv",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          response.data.filename ||
          `movements_export_${new Date().toISOString().slice(0, 10)}.csv`;
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

  const handleBulkExport = () => {
    const selectedMovements = movements.filter((m) =>
      selectedIds.includes(m.id),
    );
    if (selectedMovements.length === 0) {
      dialogs.warning("No items selected for export.");
      return;
    }
    const headers = [
      "ID",
      "Meat",
      "Batch",
      "Type",
      "Qty Change",
      "Date",
      "Notes",
    ];
    const rows = selectedMovements.map((m) => [
      m.id,
      m.meat?.name || `Meat #${m.meatId}`,
      m.batch?.batchCode || "—",
      m.movementType,
      m.qtyChange,
      new Date(m.timestamp).toLocaleString(),
      m.notes || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_movements_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dialogs.success("Export completed.");
  };

  const handleClearSelection = () => setSelectedIds([]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">📊</span>
            Inventory Movements
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Track all inventory changes including sales, returns, and
            adjustments
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
            disabled={exporting || movements.length === 0}
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
        </div>
      </div>

      {/* Summary Cards */}
      {showStats && <SummaryCards summary={summary} loading={loading} />}

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
          <p className="text-[var(--text-primary)] font-medium">
            Error loading movements
          </p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
          <button
            onClick={() => reload({ page: 1, limit })}
            className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <MovementTable
          movements={movements}
          onView={viewDialog.open}
          selectedIds={selectedIds}
          onSelectRow={(id, checked) => {
            setSelectedIds((prev) =>
              checked ? [...prev, id] : prev.filter((i) => i !== id),
            );
          }}
          onSelectAll={(checked) => {
            setSelectedIds(checked ? movements.map((m) => m.id) : []);
          }}
        />
      )}

      {/* View Dialog */}
      <MovementViewDialog
        isOpen={viewDialog.isOpen}
        movement={viewDialog.movement}
        onClose={viewDialog.close}
      />
    </div>
  );
};

export default MovementPage;
