// src/renderer/pages/inventory/stock/index.tsx
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
import { useStockLevels, type StockFilters } from "./hooks/useStockLevels";
import { SummaryCards } from "./components/SummaryCards";
import { FilterBar } from "./components/FilterBar";
import { StockTable } from "./components/StockTable";
import BulkActionsBar from "./components/BulkActionsBar";
import { usePagination } from "../../contexts/PaginationContext";
import { dialogs } from "../../utils/dialogs";

import type { StockMeat } from "./hooks/useStockLevels";
import meatAPI from "../../api/core/meat";
import { PurchaseFormDialog } from "../purchase/components/PurchaseFormDialog";

const StockLevelsPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    meats,
    suppliers,
    categories,
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
  } = useStockLevels({
    search: "",
    supplierId: undefined,
    categoryId: undefined,
    stockStatus: "all",
    sortBy: "name",
    sortOrder: "ASC",
  });

  const [showStats, setShowStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [orderInitialData, setOrderInitialData] = useState<any>(null);

  const hasFilters = !!(
    filters.search ||
    filters.supplierId ||
    filters.categoryId ||
    filters.stockStatus !== "all"
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
    <K extends keyof StockFilters>(key: K, value: StockFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters]
  );

  // ─── Selection Handlers ──────────────────────────────────────────
  const toggleSelect = (meatId: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(meatId)) newSet.delete(meatId);
    else newSet.add(meatId);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === meats.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(meats.map((m) => m.id)));
    }
  };

  const handleClearSelection = () => setSelectedIds(new Set());

  // ─── Reorder Handlers ────────────────────────────────────────────
  const handleReorder = (meat: StockMeat) => {
    if (!meat.supplier) {
      dialogs.warning("This meat has no supplier assigned.");
      return;
    }

    setOrderInitialData({
      supplierId: meat.supplier.id,
      items: [
        {
          meatId: meat.id,
          quantity: meat.reorderQty,
          unitPrice: meat.pricePerKg,
        },
      ],
    });
    setOrderFormOpen(true);
  };

  const handleBulkReorder = () => {
    if (selectedIds.size === 0) {
      dialogs.warning("Please select at least one meat product.");
      return;
    }

    const selectedMeats = meats.filter((m) => selectedIds.has(m.id));
    const supplierIds = new Set(selectedMeats.map((m) => m.supplier?.id));

    if (supplierIds.size > 1 || supplierIds.has(undefined)) {
      dialogs.warning(
        "Selected meats belong to different suppliers. Please select meats from a single supplier."
      );
      return;
    }

    const supplierId = selectedMeats[0].supplier?.id;
    if (!supplierId) {
      dialogs.warning("Selected meats have no supplier assigned.");
      return;
    }

    const items = selectedMeats.map((m) => ({
      meatId: m.id,
      quantity: m.reorderQty,
      unitPrice: m.pricePerKg,
    }));

    setOrderInitialData({ supplierId, items });
    setOrderFormOpen(true);
  };

  const handleOrderSuccess = () => {
    setOrderFormOpen(false);
    setOrderInitialData(null);
    setSelectedIds(new Set());
    dialogs.success("Purchase order created successfully.");
    reload({ page, limit });
  };

  const handleOrderClose = () => {
    setOrderFormOpen(false);
    setOrderInitialData(null);
  };

  // ─── Export ──────────────────────────────────────────────────────
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const response = await meatAPI.export({
        format: "csv",
        filters: {
          search: filters.search || undefined,
          categoryId: filters.categoryId,
          supplierId: filters.supplierId,
        },
      });
      if (response.status && response.data) {
        const blob = new Blob([response.data.data as string], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = response.data.filename || `stock_export_${new Date().toISOString().slice(0, 10)}.csv`;
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
    const selectedMeats = meats.filter((m) => selectedIds.has(m.id));
    if (selectedMeats.length === 0) {
      dialogs.warning("No items selected for export.");
      return;
    }
    const headers = ["ID", "SKU", "Name", "Supplier", "Category", "Stock", "Price/kg"];
    const rows = selectedMeats.map((m) => [
      m.id,
      m.sku,
      m.name,
      m.supplier?.name || "",
      m.category?.name || "",
      m.currentStock.toFixed(2),
      m.pricePerKg.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_stock_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dialogs.success("Export completed.");
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">📊</span>
            Stock Levels
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Monitor current inventory levels and reorder when needed
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
            disabled={exporting || meats.length === 0}
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
          suppliers={suppliers}
          categories={categories}
          onFilterChange={handleFilterChange}
          hasFilters={hasFilters}
          onReset={resetFilters}
          onReload={() => reload({ page, limit })}
        />
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          onReorder={handleBulkReorder}
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
          <p className="text-[var(--text-primary)] font-medium">Error loading stock data</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
          <button
            onClick={() => reload({ page: 1, limit })}
            className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <StockTable
          meats={meats}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={toggleSelectAll}
          onReorder={handleReorder}
        />
      )}

      {/* Purchase Form Dialog */}
      <PurchaseFormDialog
        isOpen={orderFormOpen}
        mode="add"
        purchaseId={undefined}
        initialData={orderInitialData}
        onClose={handleOrderClose}
        onSuccess={handleOrderSuccess}
      />
    </div>
  );
};

export default StockLevelsPage;