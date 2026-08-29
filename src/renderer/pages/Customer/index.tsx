// src/renderer/pages/customer/index.tsx
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
import { useCustomers, type CustomerFilters } from "./hooks/useCustomers";
import { useCustomerForm } from "./hooks/useCustomerForm";
import { useCustomerView } from "./hooks/useCustomerView";
import { FilterBar } from "./components/FilterBar";
import { CustomerTable } from "./components/CustomerTable";
import { CustomerFormDialog } from "./components/CustomerFormDialog";
import { CustomerViewDialog } from "./components/CustomerViewDialog";
import { SummaryCards } from "./components/SummaryCards";
import BulkActionsBar from "./components/BulkActionsBar";
import { usePagination } from "../../contexts/PaginationContext";
import customerAPI, { type Customer } from "../../api/core/customer";
import { dialogs } from "../../utils/dialogs";

const CustomerPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    customers,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    page,
    limit,
    stats,
    metrics,
    reload,
    fetchStats,
    goToPage,
    changeLimit,
    resetFilters,
  } = useCustomers({
    search: "",
    status: "all",
    sortBy: "name",
    sortOrder: "ASC",
    minPoints: undefined,
    maxPoints: undefined,
  });

  const formDialog = useCustomerForm();
  const viewDialog = useCustomerView();

  const [showStats, setShowStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);

  const hasFilters = !!(
    filters.search ||
    filters.status !== "all" ||
    filters.minPoints !== undefined ||
    filters.maxPoints !== undefined
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

  // ─── Fetch Stats on Mount ──────────────────────────────────────
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─── Filter Handlers ────────────────────────────────────────────
  const handleFilterChange = useCallback(
    (key: keyof CustomerFilters, value: any) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters]
  );

  // ─── CRUD Handlers ──────────────────────────────────────────────
  const handleDelete = async (customer: Customer) => {
    const confirmed = await dialogs.confirm({
      title: "Delete Customer",
      message: `Are you sure you want to delete "${customer.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      icon: "danger",
    });
    if (!confirmed) return;

    try {
      await customerAPI.delete(customer.id);
      dialogs.success(`${customer.name} deleted successfully.`);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Failed to delete customer.");
    }
  };

  const handleToggleStatus = async (customer: Customer) => {
    const newStatus = !customer.isActive;
    const action = newStatus ? "activate" : "deactivate";
    const confirmed = await dialogs.confirm({
      title: newStatus ? "Activate Customer" : "Deactivate Customer",
      message: `Are you sure you want to ${action} "${customer.name}"?`,
      confirmText: newStatus ? "Activate" : "Deactivate",
      icon: newStatus ? "success" : "warning",
    });
    if (!confirmed) return;

    try {
      if (newStatus) {
        await customerAPI.restore(customer.id);
      } else {
        await customerAPI.delete(customer.id);
      }
      dialogs.success(`${customer.name} ${newStatus ? "activated" : "deactivated"} successfully.`);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || `Failed to ${action} customer.`);
    }
  };

  // ─── Bulk Actions ───────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Delete",
      message: `Delete ${selectedIds.length} selected customer${selectedIds.length !== 1 ? "s" : ""}? This cannot be undone.`,
      confirmText: "Delete All",
      icon: "danger",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => customerAPI.delete(id)));
      dialogs.success(`${selectedIds.length} customer${selectedIds.length !== 1 ? "s" : ""} deleted.`);
      setSelectedIds([]);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Bulk delete failed.");
    }
  };

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Activate",
      message: `Activate ${selectedIds.length} selected customer${selectedIds.length !== 1 ? "s" : ""}?`,
      confirmText: "Activate All",
      icon: "success",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => customerAPI.restore(id)));
      dialogs.success(`${selectedIds.length} customer${selectedIds.length !== 1 ? "s" : ""} activated.`);
      setSelectedIds([]);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Bulk activation failed.");
    }
  };

  const handleBulkExport = () => {
    const selectedCustomers = customers.filter((c) => selectedIds.includes(c.id));
    if (selectedCustomers.length === 0) {
      dialogs.warning("No items selected for export.");
      return;
    }
    const headers = ["ID", "Name", "Email", "Phone", "Status", "Points", "Active"];
    const rows = selectedCustomers.map((c) => [
      c.id,
      c.name,
      c.email || "",
      c.phone || "",
      c.status,
      c.loyaltyPointsBalance,
      c.isActive ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_customers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dialogs.success("Export completed.");
  };

  const handleClearSelection = () => setSelectedIds([]);

  // ─── Full Export ────────────────────────────────────────────────
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const response = await customerAPI.export({
        format: "csv",
        filters: {
          searchTerm: filters.search || undefined,
          status: filters.status === "all" ? undefined : filters.status,
          minPoints: filters.minPoints,
          maxPoints: filters.maxPoints,
        },
      });
      if (response.status && response.data) {
        const blob = new Blob([response.data.data as string], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = response.data.filename || `customers_export_${new Date().toISOString().slice(0, 10)}.csv`;
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
            <span className="text-[var(--accent-gold)]">👥</span>
            Customer Directory
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Manage customers, track loyalty points, and view purchase history
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
            disabled={exporting || customers.length === 0}
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
          <button
            onClick={formDialog.openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors shadow-md font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {showStats && (
        <SummaryCards stats={stats} metrics={metrics} loading={loading} />
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
          <p className="text-[var(--text-primary)] font-medium">Error loading customers</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
          <button
            onClick={() => reload({ page: 1, limit })}
            className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <CustomerTable
          customers={customers}
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
            setSelectedIds(checked ? customers.map((c) => c.id) : []);
          }}
        />
      )}

      {/* Dialogs */}
      <CustomerFormDialog
        isOpen={formDialog.isOpen}
        mode={formDialog.mode}
        customerId={formDialog.customerId}
        initialData={formDialog.initialData}
        onClose={formDialog.close}
        onSuccess={() => {
          formDialog.close();
          reload({ page, limit });
        }}
      />

      <CustomerViewDialog
        customer={viewDialog.customer}
        sales={viewDialog.sales}
        loyaltyTransactions={viewDialog.loyaltyTransactions}
        loading={viewDialog.loading}
        isOpen={viewDialog.isOpen}
        onClose={viewDialog.close}
      />
    </div>
  );
};

export default CustomerPage;