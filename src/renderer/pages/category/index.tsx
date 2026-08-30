// src/renderer/pages/category/index.tsx
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
import { useCategories, type CategoryFilters } from "./hooks/useCategories";
import { useCategoryForm } from "./hooks/useCategoryForm";
import { useCategoryView } from "./hooks/useCategoryView";
import { FilterBar } from "./components/FilterBar";
import { CategoryTable } from "./components/CategoryTable";
import { CategoryFormDialog } from "./components/CategoryFormDialog";
import { CategoryViewDialog } from "./components/CategoryViewDialog";
import { SummaryCards } from "./components/SummaryCards";
import BulkActionsBar from "./components/BulkActionsBar";
import { usePagination } from "../../contexts/PaginationContext";
import categoryAPI, { type Category } from "../../api/core/category";
import { dialogs } from "../../utils/dialogs";

const CategoryPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    categories,
    productCounts,
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
  } = useCategories({
    search: "",
    status: "all",
    sortBy: "name",
    sortOrder: "ASC",
  });

  const formDialog = useCategoryForm();
  const viewDialog = useCategoryView();

  const [showStats, setShowStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);

  const hasFilters = !!(filters.search || filters.status !== "all");

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

  // ─── Fetch Stats on Mount ──────────────────────────────────────
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─── Filter Handlers ────────────────────────────────────────────
  const handleFilterChange = useCallback(
    <K extends keyof CategoryFilters>(key: K, value: CategoryFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters]
  );

  // ─── CRUD Handlers ──────────────────────────────────────────────
  const handleDelete = async (category: Category) => {
    const confirmed = await dialogs.confirm({
      title: "Deactivate Category",
      message: `Are you sure you want to deactivate "${category.name}"? This can be reversed later.`,
      confirmText: "Deactivate",
      icon: "warning",
    });
    if (!confirmed) return;

    try {
      await categoryAPI.delete(category.id);
      dialogs.success(`${category.name} deactivated successfully.`);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Failed to deactivate category.");
    }
  };

  const handleToggleStatus = async (category: Category) => {
    const newStatus = !category.isActive;
    const action = newStatus ? "activate" : "deactivate";
    const confirmed = await dialogs.confirm({
      title: newStatus ? "Activate Category" : "Deactivate Category",
      message: `Are you sure you want to ${action} "${category.name}"?`,
      confirmText: newStatus ? "Activate" : "Deactivate",
      icon: newStatus ? "success" : "warning",
    });
    if (!confirmed) return;

    try {
      if (newStatus) {
        await categoryAPI.activate(category.id);
      } else {
        await categoryAPI.deactivate(category.id);
      }
      dialogs.success(`${category.name} ${newStatus ? "activated" : "deactivated"} successfully.`);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || `Failed to ${action} category.`);
    }
  };

  // ─── Bulk Actions ───────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Deactivate",
      message: `Deactivate ${selectedIds.length} selected categor${selectedIds.length !== 1 ? "ies" : "y"}? This can be reversed later.`,
      confirmText: "Deactivate All",
      icon: "warning",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => categoryAPI.delete(id)));
      dialogs.success(`${selectedIds.length} categor${selectedIds.length !== 1 ? "ies" : "y"} deactivated.`);
      setSelectedIds([]);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Bulk deactivation failed.");
    }
  };

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Activate",
      message: `Activate ${selectedIds.length} selected categor${selectedIds.length !== 1 ? "ies" : "y"}?`,
      confirmText: "Activate All",
      icon: "success",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => categoryAPI.activate(id)));
      dialogs.success(`${selectedIds.length} categor${selectedIds.length !== 1 ? "ies" : "y"} activated.`);
      setSelectedIds([]);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Bulk activation failed.");
    }
  };

  const handleBulkExport = () => {
    const selectedCategories = categories.filter((c) => selectedIds.includes(c.id));
    if (selectedCategories.length === 0) {
      dialogs.warning("No items selected for export.");
      return;
    }
    const headers = ["ID", "Name", "Description", "Status", "Meat Count"];
    const rows = selectedCategories.map((c) => [
      c.id,
      c.name,
      c.description || "",
      c.isActive ? "Active" : "Inactive",
      productCounts.get(c.id) ?? 0,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_categories_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dialogs.success("Export completed.");
  };

  const handleClearSelection = () => setSelectedIds([]);

  // ─── Full Export ────────────────────────────────────────────────
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const response = await categoryAPI.export({
        format: "csv",
        filters: {
          search: filters.search || undefined,
          isActive: filters.status === "all" ? undefined : filters.status === "active",
        },
      });
      if (response.status && response.data) {
        const blob = new Blob([response.data.data as string], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = response.data.filename || `categories_export_${new Date().toISOString().slice(0, 10)}.csv`;
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
            <span className="text-[var(--accent-gold)]">🏷️</span>
            Categories
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Manage product categories for organizing your meat inventory
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
            disabled={exporting || categories.length === 0}
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
            onClick={formDialog.openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors shadow-md font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {showStats && stats && (
        <SummaryCards stats={stats} loading={loading} />
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
          <p className="text-[var(--text-primary)] font-medium">Error loading categories</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
          <button
            onClick={() => reload({ page: 1, limit })}
            className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <CategoryTable
          categories={categories}
          productCounts={productCounts}
          onView={viewDialog.open}
          onEdit={formDialog.openEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          selectedIds={selectedIds}
          onSelectRow={(id, checked) => {
            setSelectedIds((prev) =>
              checked ? [...prev, id] : prev.filter((i) => i !== id)
            );
          }}
          onSelectAll={(checked) => {
            setSelectedIds(checked ? categories.map((c) => c.id) : []);
          }}
        />
      )}

      {/* Dialogs */}
      <CategoryFormDialog
        isOpen={formDialog.isOpen}
        mode={formDialog.mode}
        categoryId={formDialog.categoryId}
        initialData={formDialog.initialData}
        onClose={formDialog.close}
        onSuccess={() => {
          formDialog.close();
          reload({ page, limit });
        }}
      />

      <CategoryViewDialog
        category={viewDialog.category}
        products={viewDialog.products}
        loading={viewDialog.loading}
        isOpen={viewDialog.isOpen}
        onClose={viewDialog.close}
      />
    </div>
  );
};

export default CategoryPage;