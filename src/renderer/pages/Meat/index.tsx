// src/renderer/pages/inventory/meat/index.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  Download,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useMeat, type MeatFilters } from "./hooks/useMeat";
import { useMeatForm } from "./hooks/useMeatForm";
import { useMeatView } from "./hooks/useMeatView";
import { MeatTable } from "./components/MeatTable";
import { FilterBar } from "./components/FilterBar";
import { MeatFormDialog } from "./components/MeatFormDialog";
import { MeatViewDialog } from "./components/MeatViewDialog";
import MeatSummaryCards from "./components/MeatSummaryCards";
import BulkActionsBar from "./components/BulkActionsBar";
import { usePagination } from "../../contexts/PaginationContext";
import meatAPI, { type Meat } from "../../api/core/meat";
import { dialogs } from "../../utils/dialogs";
import { PriceEditDialog } from "./components/PriceEditDialog";
import { ReorderLevelEditDialog } from "./components/ReorderLevelEditDialog";
import { ReorderQtyEditDialog } from "./components/ReorderQtyEditDialog";


const MeatPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    meats,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    page,
    limit,
    categories,
    suppliers,
    stats,
    reload,
    fetchStats,
    goToPage,
    changeLimit,
  } = useMeat({
    search: "",
    status: "all",
    categoryId: undefined,
    supplierId: undefined,
  });

  const formDialog = useMeatForm();
  const viewDialog = useMeatView();

  const [showStats, setShowStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);

  const hasFilters = !!(
    filters.search ||
    filters.status !== "all" ||
    filters.categoryId ||
    filters.supplierId
  );

  // ─── Pagination Sync ──────────────────────────────────────────────
  const handlePageChange = useCallback(
    (newPage: number) => {
      reload({ page: newPage, limit: pagination.pageSize });
    },
    [reload, pagination.pageSize]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      reload({ page: 1, limit: newSize });
    },
    [reload]
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
    setPagination({
      currentPage: page,
      totalItems: totalItems,
      pageSize: limit,
      onPageChange: goToPage,
      onPageSizeChange: changeLimit,
      pageSizeOptions: [10, 25, 50, 100],
      showPageSize: true,
    });
  }, [page, limit, totalItems, setPagination, goToPage, changeLimit]);

  useEffect(() => {
    return () => clearPagination();
  }, [clearPagination]);

  // ─── Fetch Stats on Mount ──────────────────────────────────────
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─── Filter Handlers ────────────────────────────────────────────
  const handleFilterChange = useCallback(
    <K extends keyof MeatFilters>(key: K, value: MeatFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      reload({ page: 1, limit: pagination.pageSize });
    },
    [setFilters, reload, pagination.pageSize]
  );

  const resetFilters = useCallback(() => {
    setFilters({ search: "", status: "all", categoryId: undefined, supplierId: undefined });
    reload({ page: 1, limit: pagination.pageSize });
  }, [setFilters, reload, pagination.pageSize]);

  // ─── CRUD Handlers ──────────────────────────────────────────────
  const handleDelete = async (meat: Meat) => {
    const confirmed = await dialogs.confirm({
      title: "Deactivate Meat",
      message: `Are you sure you want to deactivate "${meat.name}"? This can be reversed later.`,
      confirmText: "Deactivate",
      icon: "warning",
    });
    if (!confirmed) return;

    try {
      await meatAPI.delete(meat.id);
      dialogs.success(`${meat.name} deactivated successfully.`);
      reload({ page: pagination.currentPage, limit: pagination.pageSize });
      fetchStats();
    } catch (err: any) {
      dialogs.error(err.message || "Failed to deactivate meat.");
    }
  };

  const handleToggleStatus = async (meat: Meat) => {
    const newStatus = !meat.isActive;
    const action = newStatus ? "activate" : "deactivate";
    const confirmed = await dialogs.confirm({
      title: newStatus ? "Activate Meat" : "Deactivate Meat",
      message: `Are you sure you want to ${action} "${meat.name}"?`,
      confirmText: newStatus ? "Activate" : "Deactivate",
      icon: newStatus ? "success" : "warning",
    });
    if (!confirmed) return;

    try {
      if (newStatus) {
        await meatAPI.activate(meat.id);
      } else {
        await meatAPI.deactivate(meat.id);
      }
      dialogs.success(`${meat.name} ${newStatus ? "activated" : "deactivated"} successfully.`);
      reload({ page: pagination.currentPage, limit: pagination.pageSize });
      fetchStats();
    } catch (err: any) {
      dialogs.error(err.message || `Failed to ${action} meat.`);
    }
  };

  // ─── Bulk Actions ───────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Deactivate",
      message: `Deactivate ${selectedIds.length} selected meat(s)? This can be reversed later.`,
      confirmText: "Deactivate All",
      icon: "warning",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => meatAPI.delete(id)));
      dialogs.success(`${selectedIds.length} meat(s) deactivated.`);
      setSelectedIds([]);
      reload({ page: pagination.currentPage, limit: pagination.pageSize });
      fetchStats();
    } catch (err: any) {
      dialogs.error(err.message || "Bulk deactivation failed.");
    }
  };

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Activate",
      message: `Activate ${selectedIds.length} selected meat(s)?`,
      confirmText: "Activate All",
      icon: "success",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => meatAPI.activate(id)));
      dialogs.success(`${selectedIds.length} meat(s) activated.`);
      setSelectedIds([]);
      reload({ page: pagination.currentPage, limit: pagination.pageSize });
      fetchStats();
    } catch (err: any) {
      dialogs.error(err.message || "Bulk activation failed.");
    }
  };

  const handleBulkExport = () => {
    const selectedMeats = meats.filter((m) => selectedIds.includes(m.id));
    if (selectedMeats.length === 0) {
      dialogs.warning("No items selected for export.");
      return;
    }
    const headers = ["ID", "SKU", "Name", "Category", "Price/kg", "Status"];
    const rows = selectedMeats.map((m) => [
      m.id,
      m.sku,
      m.name,
      m.category?.name || "",
      m.pricePerKg.toFixed(2),
      m.isActive ? "Active" : "Inactive",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_meats_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dialogs.success("Export completed.");
  };

  const handleClearSelection = () => setSelectedIds([]);

  // ─── Full Export ────────────────────────────────────────────────
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const response = await meatAPI.export({
        format: "csv",
        filters: {
          search: filters.search || undefined,
          isActive: filters.status === "all" ? undefined : filters.status === "active",
          categoryId: filters.categoryId,
          supplierId: filters.supplierId,
        },
      });
      if (response.status && response.data) {
        const blob = new Blob([response.data.data as string], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = response.data.filename || `meats_export_${new Date().toISOString().slice(0, 10)}.csv`;
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



   const [priceDialog, setPriceDialog] = useState<{
    isOpen: boolean;
    meat: Meat | null;
  }>({ isOpen: false, meat: null });

  const [reorderLevelDialog, setReorderLevelDialog] = useState<{
    isOpen: boolean;
    meat: Meat | null;
  }>({ isOpen: false, meat: null });

  const [reorderQtyDialog, setReorderQtyDialog] = useState<{
    isOpen: boolean;
    meat: Meat | null;
  }>({ isOpen: false, meat: null });

  // ─── Handlers for the new dialogs ────────────────────────────
  const handlePriceEdit = useCallback((meat: Meat) => {
    setPriceDialog({ isOpen: true, meat });
  }, []);

  const handleReorderLevelEdit = useCallback((meat: Meat) => {
    setReorderLevelDialog({ isOpen: true, meat });
  }, []);

  const handleReorderQtyEdit = useCallback((meat: Meat) => {
    setReorderQtyDialog({ isOpen: true, meat });
  }, []);

  const handleClosePriceDialog = useCallback(() => {
    setPriceDialog({ isOpen: false, meat: null });
  }, []);

  const handleCloseReorderLevelDialog = useCallback(() => {
    setReorderLevelDialog({ isOpen: false, meat: null });
  }, []);

  const handleCloseReorderQtyDialog = useCallback(() => {
    setReorderQtyDialog({ isOpen: false, meat: null });
  }, []);

  const handleDialogSuccess = useCallback(() => {
    reload({ page: pagination.currentPage, limit: pagination.pageSize });
    fetchStats();
  }, [reload, fetchStats, pagination.currentPage, pagination.pageSize]);




  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">🥩</span>
            Meat Products
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Manage meat inventory, prices, and availability
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
            disabled={exporting || meats.length === 0}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors disabled:opacity-50"
            title="Export all (current filters)"
          >
            <Download className={`w-4 h-4 ${exporting ? "animate-pulse" : ""}`} />
          </button>
          <button
            onClick={() => {
              reload({ page: pagination.currentPage, limit: pagination.pageSize });
              fetchStats();
            }}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={formDialog.openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors shadow-md font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Meat
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {showStats && stats && (
        <MeatSummaryCards
          totalActive={stats.totalActive}
          totalInactive={stats.totalInactive}
          averagePrice={stats.averagePricePerKg}
          byCategory={stats.byCategory}
        />
      )}

      {/* Filters Bar */}
      {showFilters && (
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          categories={categories}
          suppliers={suppliers}
          hasFilters={hasFilters}
          onReset={resetFilters}
        />
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.length}
          onActivate={handleBulkActivate}
          onDeactivate={handleBulkDelete}
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
          <p className="text-[var(--text-primary)] font-medium">Error loading meats</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
          <button
            onClick={() => reload({ page: 1, limit: pagination.pageSize })}
            className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
      <MeatTable
        meats={meats}
        onView={viewDialog.open}
        onEdit={formDialog.openEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        onPriceEdit={handlePriceEdit}
        onReorderLevelEdit={handleReorderLevelEdit}
        onReorderQtyEdit={handleReorderQtyEdit}
        selectedIds={selectedIds}
        onSelectRow={(id, checked) => {
          setSelectedIds((prev) =>
            checked ? [...prev, id] : prev.filter((i) => i !== id)
          );
        }}
        onSelectAll={(checked) => {
          setSelectedIds(checked ? meats.map((m) => m.id) : []);
        }}
      />
      )}

      {/* Modals */}
      <MeatFormDialog
        isOpen={formDialog.isOpen}
        mode={formDialog.mode}
        meatId={formDialog.meatId}
        initialData={formDialog.initialData}
        onClose={formDialog.close}
        onSuccess={() => {
          formDialog.close();
          reload({ page: pagination.currentPage, limit: pagination.pageSize });
          fetchStats();
        }}
      />

      <MeatViewDialog
        meat={viewDialog.meat}
        batches={viewDialog.batches}
        loading={viewDialog.loading}
        isOpen={viewDialog.isOpen}
        onClose={viewDialog.close}
      />

       <PriceEditDialog
        meat={priceDialog.meat}
        isOpen={priceDialog.isOpen}
        onClose={handleClosePriceDialog}
        onSuccess={handleDialogSuccess}
      />

      <ReorderLevelEditDialog
        meat={reorderLevelDialog.meat}
        isOpen={reorderLevelDialog.isOpen}
        onClose={handleCloseReorderLevelDialog}
        onSuccess={handleDialogSuccess}
      />

      <ReorderQtyEditDialog
        meat={reorderQtyDialog.meat}
        isOpen={reorderQtyDialog.isOpen}
        onClose={handleCloseReorderQtyDialog}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
};

export default MeatPage;