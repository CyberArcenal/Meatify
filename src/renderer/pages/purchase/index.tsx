// src/renderer/pages/inventory/purchases/index.tsx
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
import { usePurchases, type PurchaseFilters } from "./hooks/usePurchases";
import { usePurchaseForm } from "./hooks/usePurchaseForm";
import { usePurchaseView } from "./hooks/usePurchaseView";
import { FilterBar } from "./components/FilterBar";
import { PurchaseTable } from "./components/PurchaseTable";
import { PurchaseFormDialog } from "./components/PurchaseFormDialog";
import { PurchaseViewDialog } from "./components/PurchaseViewDialog";
import { StatusUpdateDialog } from "./components/StatusUpdateDialog";
import { SummaryCards } from "./components/SummaryCards";
import BulkActionsBar from "./components/BulkActionsBar";
import { usePagination } from "../../contexts/PaginationContext";
import { dialogs } from "../../utils/dialogs";
import purchaseAPI, { type Purchase } from "../../api/core/purchase";

const PurchasePage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    purchases,
    suppliers,
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
  } = usePurchases({
    search: "",
    status: "",
    supplierId: undefined,
    startDate: undefined,
    endDate: undefined,
    sortBy: "orderDate",
    sortOrder: "DESC",
  });

  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    purchase?: Purchase;
  }>({ open: false });

  const formDialog = usePurchaseForm();
  const viewDialog = usePurchaseView();

  const [showStats, setShowStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);

  const hasFilters = !!(
    filters.search ||
    filters.status ||
    filters.supplierId ||
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
  const handleFilterChange = useCallback(
    <K extends keyof PurchaseFilters>(key: K, value: PurchaseFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters]
  );

  // ─── CRUD Handlers ──────────────────────────────────────────────
  const handleStatusUpdate = (purchase: Purchase) => {
    setStatusDialog({ open: true, purchase });
  };

  const handleDelete = async (purchase: Purchase) => {
    const confirmed = await dialogs.confirm({
      title: "Cancel Purchase",
      message: `Are you sure you want to cancel purchase ${purchase.referenceNo || `#${purchase.id}`}?`,
      confirmText: "Cancel",
      icon: "warning",
    });
    if (!confirmed) return;

    try {
      await purchaseAPI.cancel(purchase.id, "Cancelled by user");
      dialogs.success("Purchase cancelled successfully.");
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Failed to cancel purchase.");
    }
  };

  const handleStatusConfirm = async (newStatus: string) => {
    const purchase = statusDialog.purchase;
    if (!purchase) return;

    try {
      if (newStatus === "approved") {
        await purchaseAPI.approve(purchase.id);
      } else if (newStatus === "completed") {
        await purchaseAPI.complete(purchase.id);
      } else if (newStatus === "cancelled") {
        await purchaseAPI.cancel(purchase.id, "Cancelled via status update");
      }
      dialogs.success("Status updated successfully.");
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Failed to update status.");
    } finally {
      setStatusDialog({ open: false, purchase: undefined });
    }
  };

  // ─── Bulk Actions ───────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Cancel",
      message: `Cancel ${selectedIds.length} selected purchase${selectedIds.length !== 1 ? "s" : ""}?`,
      confirmText: "Cancel All",
      icon: "warning",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => purchaseAPI.cancel(id, "Bulk cancellation")));
      dialogs.success(`${selectedIds.length} purchase${selectedIds.length !== 1 ? "s" : ""} cancelled.`);
      setSelectedIds([]);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Bulk cancellation failed.");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Approve",
      message: `Approve ${selectedIds.length} selected purchase${selectedIds.length !== 1 ? "s" : ""}?`,
      confirmText: "Approve All",
      icon: "info",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => purchaseAPI.approve(id)));
      dialogs.success(`${selectedIds.length} purchase${selectedIds.length !== 1 ? "s" : ""} approved.`);
      setSelectedIds([]);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Bulk approval failed.");
    }
  };

  const handleBulkComplete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Complete",
      message: `Complete ${selectedIds.length} selected purchase${selectedIds.length !== 1 ? "s" : ""}?`,
      confirmText: "Complete All",
      icon: "info",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => purchaseAPI.complete(id)));
      dialogs.success(`${selectedIds.length} purchase${selectedIds.length !== 1 ? "s" : ""} completed.`);
      setSelectedIds([]);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Bulk completion failed.");
    }
  };

  const handleBulkExport = () => {
    const selectedPurchases = purchases.filter((p) => selectedIds.includes(p.id));
    if (selectedPurchases.length === 0) {
      dialogs.warning("No items selected for export.");
      return;
    }
    const headers = ["ID", "Reference", "Supplier", "Status", "Total", "Order Date"];
    const rows = selectedPurchases.map((p) => [
      p.id,
      p.referenceNo || "",
      p.supplier?.name || "",
      p.status,
      p.totalAmount.toFixed(2),
      new Date(p.orderDate).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_purchases_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dialogs.success("Export completed.");
  };

  const handleClearSelection = () => setSelectedIds([]);

  // ─── Full Export ────────────────────────────────────────────────
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const response = await purchaseAPI.export({
        format: "csv",
        filters: {
          search: filters.search || undefined,
          status: filters.status || undefined,
          supplierId: filters.supplierId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      });
      if (response.status && response.data) {
        const blob = new Blob([response.data.data as string], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = response.data.filename || `purchases_export_${new Date().toISOString().slice(0, 10)}.csv`;
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
            Purchase Orders
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Manage supplier purchases, track inventory arrivals, and monitor costs
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
            disabled={exporting || purchases.length === 0}
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
            New Purchase
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
          suppliers={suppliers}
          hasFilters={hasFilters}
          onReset={resetFilters}
          onReload={() => reload({ page, limit })}
        />
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.length}
          onApprove={handleBulkApprove}
          onComplete={handleBulkComplete}
          onCancel={handleBulkDelete}
          onDelete={handleBulkDelete}
          onExport={handleBulkExport}
          onClearSelection={handleClearSelection}
          showApprove={selectedIds.some((id) => purchases.find((p) => p.id === id)?.status === "pending")}
          showComplete={selectedIds.some((id) => purchases.find((p) => p.id === id)?.status === "approved")}
          showCancel={selectedIds.some((id) => purchases.find((p) => p.id === id)?.status === "pending" || purchases.find((p) => p.id === id)?.status === "approved")}
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
          <p className="text-[var(--text-primary)] font-medium">Error loading purchases</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
          <button
            onClick={() => reload({ page: 1, limit })}
            className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <PurchaseTable
          purchases={purchases}
          onView={(purchase) => viewDialog.open(purchase.id)}
          onEdit={formDialog.openEdit}
          onDelete={handleDelete}
          onStatusUpdate={handleStatusUpdate}
          selectedIds={selectedIds}
          onSelectRow={(id, checked) => {
            setSelectedIds((prev) =>
              checked ? [...prev, id] : prev.filter((i) => i !== id)
            );
          }}
          onSelectAll={(checked) => {
            setSelectedIds(checked ? purchases.map((p) => p.id) : []);
          }}
        />
      )}

      {/* Dialogs */}
      <PurchaseFormDialog
        isOpen={formDialog.isOpen}
        mode={formDialog.mode}
        purchaseId={formDialog.purchaseId}
        initialData={formDialog.initialData}
        onClose={formDialog.close}
        onSuccess={() => {
          formDialog.close();
          reload({ page, limit });
        }}
      />

      <PurchaseViewDialog
        purchase={viewDialog.purchase}
        items={viewDialog.items}
        loading={viewDialog.loading}
        isOpen={viewDialog.isOpen}
        onClose={viewDialog.close}
      />

      <StatusUpdateDialog
        isOpen={statusDialog.open}
        purchase={statusDialog.purchase || null}
        onClose={() => setStatusDialog({ open: false, purchase: undefined })}
        onConfirm={handleStatusConfirm}
      />
    </div>
  );
};

export default PurchasePage;