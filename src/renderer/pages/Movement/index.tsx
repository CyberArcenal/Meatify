// src/renderer/pages/inventory/movements/index.tsx
import React, { useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useMovements, type MovementFilters } from "./hooks/useMovements";
import { useMovementView } from "./hooks/useMovementView";
import { SummaryCards } from "./components/SummaryCards";
import { FilterBar } from "./components/FilterBar";
import { MovementTable } from "./components/MovementTable";
import { MovementViewDialog } from "./components/MovementViewDialog";
import { usePagination } from "../../contexts/PaginationContext";

const MovementPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();
  const {
    movements,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    reload,
    summary,
  } = useMovements({
    movementType: "all",
    startDate: undefined,
    endDate: undefined,
    search: "",
    direction: "all",
  });

  const viewDialog = useMovementView();

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

  const handleFilterChange = (key: keyof MovementFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    reload({ page: 1, limit: pagination.pageSize });
  };

  return (
    <div className="h-full flex flex-col bg-[var(--card-bg)] p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-gold-hover)] bg-clip-text text-transparent">
          Inventory Movements
        </h1>
      </div>

      {/* Summary Cards */}
      {!loading && !error && <SummaryCards summary={summary} />}

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReload={() => reload({ page: pagination.currentPage, limit: pagination.pageSize })}
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
              Error loading movements
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
          <MovementTable movements={movements} onView={viewDialog.open} />
        </div>
      )}

      {/* View Dialog */}
      <MovementViewDialog
        isOpen={viewDialog.isOpen}
        movement={viewDialog.movement}
        onClose={viewDialog.close}
      />
    </div>
  );
};

export default MovementPage;