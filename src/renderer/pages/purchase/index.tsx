// src/renderer/pages/inventory/purchases/index.tsx
import React, { useEffect, useState } from "react";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { usePurchases, type PurchaseFilters } from "./hooks/usePurchases";
import { usePurchaseForm } from "./hooks/usePurchaseForm";
import { usePurchaseView } from "./hooks/usePurchaseView";
import { FilterBar } from "./components/FilterBar";
import { PurchaseTable } from "./components/PurchaseTable";
import { PurchaseFormDialog } from "./components/PurchaseFormDialog";
import { PurchaseViewDialog } from "./components/PurchaseViewDialog";
import { StatusUpdateDialog } from "./components/StatusUpdateDialog";
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
    reload,
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

  const handleFilterChange = <K extends keyof PurchaseFilters>(
    key: K,
    value: PurchaseFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    reload({ page: 1, limit: pagination.pageSize });
  };

  const handleStatusUpdate = (purchase: Purchase) => {
    setStatusDialog({ open: true, purchase });
  };

  const handleDelete = async (purchase: Purchase) => {
    const confirmed = await dialogs.confirm({
      title: "Cancel Purchase",
      message: `Are you sure you want to cancel purchase ${purchase.referenceNo || `#${purchase.id}`}?`,
    });
    if (!confirmed) return;

    try {
      await purchaseAPI.cancel(purchase.id, "Cancelled by user");
      dialogs.alert({
        title: "Success",
        message: "Purchase cancelled successfully.",
      });
      reload({ page: pagination.currentPage, limit: pagination.pageSize });
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
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
      dialogs.alert({
        title: "Success",
        message: "Status updated successfully.",
      });
      reload({ page: pagination.currentPage, limit: pagination.pageSize });
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
    } finally {
      setStatusDialog({ open: false, purchase: undefined });
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--card-bg)] p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-gold-hover)] bg-clip-text text-transparent">
          Purchase Orders
        </h1>
        <button
          onClick={formDialog.openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          New Purchase
        </button>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        suppliers={suppliers}
        onReload={() => reload({ page: pagination.currentPage, limit: pagination.pageSize })}
      />

      {/* Purchase Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[var(--accent-red)]" />
            <p className="text-[var(--text-primary)] font-medium">
              Error loading purchases
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
          <PurchaseTable
            purchases={purchases}
            onView={(purchase) => viewDialog.open(purchase.id)}
            onEdit={formDialog.openEdit}
            onDelete={handleDelete}
            onStatusUpdate={handleStatusUpdate}
          />
        </div>
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
          reload({ page: pagination.currentPage, limit: pagination.pageSize });
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