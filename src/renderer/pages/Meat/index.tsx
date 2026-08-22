// src/renderer/pages/inventory/meat/index.tsx
import React, { useEffect } from "react";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { FilterBar } from "./components/FilterBar";
import { usePagination } from "../../contexts/PaginationContext";
import { useMeat, type MeatFilters } from "./hooks/useProducts";
import meatAPI, { type Meat } from "../../api/core/meat";
import { dialogs } from "../../utils/dialogs";
import { MeatFormDialog } from "./components/ProductFormDialog";
import { MeatTable } from "./components/ProductTable";
import { MeatViewDialog } from "./components/ProductViewDialog";
import { useMeatForm } from "./hooks/useProductForm";
import { useMeatView } from "./hooks/useProductView";


const MeatPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    meats,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    categories,
    suppliers,
    reload,
  } = useMeat({
    search: "",
    status: "all",
    categoryId: undefined,
    supplierId: undefined,
  });

  const formDialog = useMeatForm();
  const viewDialog = useMeatView();

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

  const handleFilterChange = <K extends keyof MeatFilters>(
    key: K,
    value: MeatFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    reload({ page: 1, limit: pagination.pageSize });
  };

  const handleDelete = async (meat: Meat) => {
    const confirmed = await dialogs.confirm({
      title: "Deactivate Meat",
      message: `Are you sure you want to deactivate ${meat.name}? This action can be reversed later.`,
    });
    if (!confirmed) return;

    try {
      await meatAPI.delete(meat.id);
      dialogs.alert({
        title: "Success",
        message: "Meat deactivated successfully.",
      });
      reload({ page: pagination.currentPage, limit: pagination.pageSize });
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--card-bg)] p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-gold-hover)] bg-clip-text text-transparent">
          Meat Products
        </h1>
        <button
          onClick={formDialog.openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          Add Meat
        </button>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        categories={categories}
        suppliers={suppliers}
        onReload={() => reload({ page: pagination.currentPage, limit: pagination.pageSize })}
      />

      {/* Meat Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[var(--accent-red)]" />
            <p className="text-[var(--text-primary)] font-medium">
              Error loading meats
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
          <MeatTable
            meats={meats}
            onView={viewDialog.open}
            onEdit={formDialog.openEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* Dialogs */}
      <MeatFormDialog
        isOpen={formDialog.isOpen}
        mode={formDialog.mode}
        meatId={formDialog.meatId}
        initialData={formDialog.initialData}
        onClose={formDialog.close}
        onSuccess={() => {
          formDialog.close();
          reload({ page: pagination.currentPage, limit: pagination.pageSize });
        }}
      />

      <MeatViewDialog
        meat={viewDialog.meat}
        batches={viewDialog.batches}
        loading={viewDialog.loading}
        isOpen={viewDialog.isOpen}
        onClose={viewDialog.close}
      />
    </div>
  );
};

export default MeatPage;