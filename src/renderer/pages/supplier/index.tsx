// src/renderer/pages/inventory/suppliers/index.tsx
import React, { useEffect } from "react";
import { Plus, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useSuppliers, type SupplierFilters } from "./hooks/useSuppliers";
import { useSupplierForm } from "./hooks/useSupplierForm";
import { useSupplierView } from "./hooks/useSupplierView";
import { FilterBar } from "./components/FilterBar";
import { SupplierTable } from "./components/SupplierTable";
import { SupplierFormDialog } from "./components/SupplierFormDialog";
import { SupplierViewDialog } from "./components/SupplierViewDialog";
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
    reload,
  } = useSuppliers({
    search: "",
    status: "all",
    sortBy: "name",
    sortOrder: "ASC",
  });

  const formDialog = useSupplierForm();
  const viewDialog = useSupplierView();

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

  const handleFilterChange = <K extends keyof SupplierFilters>(
    key: K,
    value: SupplierFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    reload({ page: 1, limit: pagination.pageSize });
  };

  const handleDelete = async (supplier: Supplier) => {
    const confirmed = await dialogs.confirm({
      title: "Deactivate Supplier",
      message: `Are you sure you want to deactivate ${supplier.name}? This action can be reversed later.`,
    });
    if (!confirmed) return;

    try {
      await supplierAPI.delete(supplier.id);
      dialogs.alert({
        title: "Success",
        message: "Supplier deactivated successfully.",
      });
      reload({ page: pagination.currentPage, limit: pagination.pageSize });
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
    }
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
            Suppliers
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {totalItems} total suppliers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--card-secondary-bg)] rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)] border border-[var(--border-color)]"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={formDialog.openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReload={handleRefresh}
      />

      {/* Supplier Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[var(--accent-red)]" />
            <p className="text-[var(--text-primary)] font-medium">
              Error loading suppliers
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
          <SupplierTable
            suppliers={suppliers}
            meatCounts={meatCounts}
            onView={viewDialog.open}
            onEdit={formDialog.openEdit}
            onDelete={handleDelete}
          />
        </div>
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
          reload({ page: pagination.currentPage, limit: pagination.pageSize });
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