// src/renderer/pages/inventory/stock/index.tsx
import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, ShoppingCart, RefreshCw } from "lucide-react";
import { useStockLevels, type StockFilters } from "./hooks/useStockLevels";
import { StockSummaryCards } from "./components/StockSummaryCards";
import { StockFilterBar } from "./components/StockFilterBar";
import { StockTable } from "./components/StockTable";
import type { StockMeat } from "./hooks/useStockLevels";
import { usePagination } from "../../contexts/PaginationContext";
import { dialogs } from "../../utils/dialogs";
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
    reload,
  } = useStockLevels({
    search: "",
    supplierId: undefined,
    categoryId: undefined,
    stockStatus: "all",
    sortBy: "name",
    sortOrder: "ASC",
  });

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [orderInitialData, setOrderInitialData] = useState<any>(null);

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

  const handleFilterChange = <K extends keyof StockFilters>(
    key: K,
    value: StockFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    reload({ page: 1, limit: pagination.pageSize });
    setSelectedIds(new Set());
  };

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

  const handleBulkReorder = () => {
    if (selectedIds.size === 0) {
      dialogs.alert({
        title: "No Selection",
        message: "Please select at least one meat product.",
      });
      return;
    }

    const selectedMeats = meats.filter((m) => selectedIds.has(m.id));
    const supplierIds = new Set(selectedMeats.map((m) => m.supplier?.id));

    if (supplierIds.size > 1 || supplierIds.has(undefined)) {
      dialogs.alert({
        title: "Multiple Suppliers",
        message:
          "Selected meats belong to different suppliers. Please select meats from a single supplier.",
      });
      return;
    }

    const supplierId = selectedMeats[0].supplier?.id;
    if (!supplierId) {
      dialogs.alert({
        title: "No Supplier",
        message: "Selected meats have no supplier assigned.",
      });
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

  const handleSingleReorder = (meat: StockMeat) => {
    if (!meat.supplier) {
      dialogs.alert({
        title: "No Supplier",
        message: "This meat has no supplier assigned.",
      });
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

  const handleOrderSuccess = () => {
    setOrderFormOpen(false);
    setOrderInitialData(null);
    setSelectedIds(new Set());
    dialogs.alert({
      title: "Success",
      message: "Purchase order created successfully.",
    });
    reload({ page: pagination.currentPage, limit: pagination.pageSize });
  };

  const handleOrderClose = () => {
    setOrderFormOpen(false);
    setOrderInitialData(null);
  };

  const handleRefresh = () => {
    reload({ page: pagination.currentPage, limit: pagination.pageSize });
  };

  return (
    <div className="h-full flex flex-col bg-[var(--card-bg)] p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-gold-hover)] bg-clip-text text-transparent">
            Stock Levels
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {totalItems} total meats tracked
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBulkReorder}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <ShoppingCart className="w-4 h-4" />
            Reorder Selected ({selectedIds.size})
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--card-secondary-bg)] rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)] border border-[var(--border-color)]"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {!loading && !error && <StockSummaryCards meats={meats} />}

      {/* Filter Bar */}
      <StockFilterBar
        filters={filters}
        suppliers={suppliers}
        categories={categories}
        onFilterChange={handleFilterChange}
        onReload={handleRefresh}
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
              Error loading stock levels
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
          <StockTable
            meats={meats}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={toggleSelectAll}
            onReorder={handleSingleReorder}
          />
        </div>
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