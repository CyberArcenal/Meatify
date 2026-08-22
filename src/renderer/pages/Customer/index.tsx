// src/renderer/pages/customer/index.tsx
import React, { useEffect } from "react";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { dialogs } from "../../utils/dialogs";
import customerAPI, { type Customer } from "../../api/core/customer";
import { useCustomers, type CustomerFilters } from "./hooks/useCustomers";
import { useCustomerForm } from "./hooks/useCustomerForm";
import { useCustomerView } from "./hooks/useCustomerView";
import { FilterBar } from "./components/FilterBar";
import { CustomerTable } from "./components/CustomerTable";
import { CustomerFormDialog } from "./components/CustomerFormDialog";
import { CustomerViewDialog } from "./components/CustomerViewDialog";
import { usePagination } from "../../contexts/PaginationContext";

const CustomerPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();
  const {
    customers,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    metrics,
    reload,
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

  const handleFilterChange = (key: keyof CustomerFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    reload({ page: 1, limit: pagination.pageSize });
  };

  const handleDelete = async (customer: Customer) => {
    const confirmed = await dialogs.confirm({
      title: "Delete Customer",
      message: `Are you sure you want to delete ${customer.name}? This action cannot be undone.`,
    });
    if (!confirmed) return;

    try {
      await customerAPI.delete(customer.id);
      dialogs.alert({
        title: "Success",
        message: "Customer deleted successfully.",
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
          Customer Directory
        </h1>
        <button
          onClick={formDialog.openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-lg p-4">
          <p className="text-sm text-[var(--text-tertiary)]">Total Customers</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {metrics.total}
          </p>
        </div>
        <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-lg p-4">
          <p className="text-sm text-[var(--text-tertiary)]">VIP</p>
          <p className="text-2xl font-bold text-[var(--customer-vip)]">
            {metrics.vipCount}
          </p>
        </div>
        <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-lg p-4">
          <p className="text-sm text-[var(--text-tertiary)]">Elite</p>
          <p className="text-2xl font-bold text-[var(--customer-loyal)]">
            {metrics.eliteCount}
          </p>
        </div>
        <div className="bg-[var(--card-secondary-bg)] border border-[var(--border-color)] rounded-lg p-4">
          <p className="text-sm text-[var(--text-tertiary)]">
            New This Month
          </p>
          <p className="text-2xl font-bold text-[var(--customer-new)]">
            {metrics.newThisMonth}
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReload={() => reload({ page: pagination.currentPage, limit: pagination.pageSize })}
      />

      {/* Customer Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[var(--accent-red)]" />
            <p className="text-[var(--text-primary)] font-medium">
              Error loading customers
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
          <CustomerTable
            customers={customers}
            onView={viewDialog.open}
            onEdit={formDialog.openEdit}
            onDelete={handleDelete}
          />
        </div>
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
          reload({ page: pagination.currentPage, limit: pagination.pageSize });
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