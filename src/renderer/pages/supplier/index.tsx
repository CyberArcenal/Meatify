// src/renderer/pages/inventory/suppliers/index.tsx
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
import { useSuppliers, type SupplierFilters } from "./hooks/useSuppliers";
import { useSupplierForm } from "./hooks/useSupplierForm";
import { useSupplierView } from "./hooks/useSupplierView";
import { FilterBar } from "./components/FilterBar";
import { SupplierTable } from "./components/SupplierTable";
import { SupplierFormDialog } from "./components/SupplierFormDialog";
import { SupplierViewDialog } from "./components/SupplierViewDialog";
import { SummaryCards } from "./components/SummaryCards";
import BulkActionsBar from "./components/BulkActionsBar";
import { usePagination } from "../../contexts/PaginationContext";
import type { Supplier } from "../../api/core/supplier";
import { dialogs } from "../../utils/dialogs";
import supplierAPI from "../../api/core/supplier";

const SupplierPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    suppliers,
    meatCounts,
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
  } = useSuppliers({
    search: "",
    status: "all",
    sortBy: "name",
    sortOrder: "ASC",
  });

  const formDialog = useSupplierForm();
  const viewDialog = useSupplierView();

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

  // ─── Filter Handlers ────────────────────────────────────────────
  const handleFilterChange = useCallback(
    <K extends keyof SupplierFilters>(key: K, value: SupplierFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters]
  );

  // ─── CRUD Handlers ──────────────────────────────────────────────
  const handleDelete = async (supplier: Supplier) => {
    const confirmed = await dialogs.confirm({
      title: "Deactivate Supplier",
      message: `Are you sure you want to deactivate "${supplier.name}"? This can be reversed later.`,
      confirmText: "Deactivate",
      icon: "warning",
    });
    if (!confirmed) return;

    try {
      await supplierAPI.delete(supplier.id);
      dialogs.success(`${supplier.name} deactivated successfully.`);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Failed to deactivate supplier.");
    }
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    const newStatus = !supplier.isActive;
    const action = newStatus ? "activate" : "deactivate";
    const confirmed = await dialogs.confirm({
      title: newStatus ? "Activate Supplier" : "Deactivate Supplier",
      message: `Are you sure you want to ${action} "${supplier.name}"?`,
      confirmText: newStatus ? "Activate" : "Deactivate",
      icon: newStatus ? "success" : "warning",
    });
    if (!confirmed) return;

    try {
      if (newStatus) {
        await supplierAPI.activate(supplier.id);
      } else {
        await supplierAPI.deactivate(supplier.id);
      }
      dialogs.success(`${supplier.name} ${newStatus ? "activated" : "deactivated"} successfully.`);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || `Failed to ${action} supplier.`);
    }
  };

  // ─── Bulk Actions ───────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Deactivate",
      message: `Deactivate ${selectedIds.length} selected supplier${selectedIds.length !== 1 ? "s" : ""}? This can be reversed later.`,
      confirmText: "Deactivate All",
      icon: "warning",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => supplierAPI.delete(id)));
      dialogs.success(`${selectedIds.length} supplier${selectedIds.length !== 1 ? "s" : ""} deactivated.`);
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
      message: `Activate ${selectedIds.length} selected supplier${selectedIds.length !== 1 ? "s" : ""}?`,
      confirmText: "Activate All",
      icon: "success",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => supplierAPI.activate(id)));
      dialogs.success(`${selectedIds.length} supplier${selectedIds.length !== 1 ? "s" : ""} activated.`);
      setSelectedIds([]);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Bulk activation failed.");
    }
  };

  const handleBulkExport = () => {
    const selectedSuppliers = suppliers.filter((s) => selectedIds.includes(s.id));
    if (selectedSuppliers.length === 0) {
      dialogs.warning("No items selected for export.");
      return;
    }
    const headers = ["ID", "Name", "Email", "Phone", "Address", "Status", "Meat Count"];
    const rows = selectedSuppliers.map((s) => [
      s.id,
      s.name,
      s.email || "",
      s.phone || "",
      s.address || "",
      s.isActive ? "Active" : "Inactive",
      meatCounts.get(s.id) ?? 0,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_suppliers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dialogs.success("Export completed.");
  };

  const handleClearSelection = () => setSelectedIds([]);

  // ─── Full Export ────────────────────────────────────────────────
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const response = await supplierAPI.export({
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
        a.download = response.data.filename || `suppliers_export_${new Date().toISOString().slice(0, 10)}.csv`;
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
            <span className="text-[var(--accent-gold)]">🏢</span>
            Suppliers
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Manage suppliers, track purchases, and monitor supplier performance
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
            disabled={exporting || suppliers.length === 0}
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
            Add Supplier
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
          <p className="text-[var(--text-primary)] font-medium">Error loading suppliers</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
          <button
            onClick={() => reload({ page: 1, limit })}
            className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <SupplierTable
          suppliers={suppliers}
          meatCounts={meatCounts}
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
            setSelectedIds(checked ? suppliers.map((s) => s.id) : []);
          }}
        />
      )}

      {/* Dialogs */}
      <SupplierFormDialog
        isOpen={formDialog.isOpen}
        mode={formDialog.mode}
        supplierId={formDialog.supplierId}
        initialData={formDialog.initialData}
        onClose={formDialog.close}
        onSuccess={() => {
          formDialog.close();
          reload({ page, limit });
        }}
      />

      <SupplierViewDialog
        supplier={viewDialog.supplier}
        meats={viewDialog.meats}
        purchases={viewDialog.purchases}
        metrics={viewDialog.metrics}
        loading={viewDialog.loading}
        isOpen={viewDialog.isOpen}
        onClose={viewDialog.close}
      />
    </div>
  );
};

export default SupplierPage;