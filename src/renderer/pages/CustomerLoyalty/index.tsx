// src/renderer/pages/Loyalty/index.tsx
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
import { useLoyalty, type LoyaltyFilters } from "./hooks/useLoyalty";
import { useLoyaltyAdjustment } from "./hooks/useLoyaltyAdjustment";
import { useCustomerLoyaltyView } from "./hooks/useCustomerLoyaltyView";
import { SummaryCards } from "./components/SummaryCards";
import { FilterBar } from "./components/FilterBar";
import { LoyaltyTransactionsTable } from "./components/LoyaltyTransactionsTable";
import { LoyaltyAnalytics } from "./components/LoyaltyAnalytics";
import { LoyaltyAdjustmentDialog } from "./components/LoyaltyAdjustmentDialog";
import { CustomerLoyaltyViewDialog } from "./components/CustomerLoyaltyViewDialog";
import BulkActionsBar from "./components/BulkActionsBar";
import { usePagination } from "../../contexts/PaginationContext";
import loyaltyAPI from "../../api/core/loyaltyTransaction";
import { dialogs } from "../../utils/dialogs";

const CustomerLoyaltyPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    transactions,
    statistics,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    page,
    limit,
    topCustomers,
    pointsDistribution,
    monthlyTrends,
    reload,
    goToPage,
    changeLimit,
    resetFilters,
  } = useLoyalty({
    type: "all",
    customerId: undefined,
    startDate: undefined,
    endDate: undefined,
    search: "",
  });

  const adjustmentDialog = useLoyaltyAdjustment();
  const viewDialog = useCustomerLoyaltyView();

  const [showStats, setShowStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const hasFilters = !!(
    filters.search ||
    filters.type !== "all" ||
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
    (key: keyof LoyaltyFilters, value: any) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters]
  );

  // ─── Export ────────────────────────────────────────────────────
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const response = await loyaltyAPI.export({
        format: "csv",
        filters: {
          transactionType: filters.type === "all" ? undefined : filters.type,
          customerId: filters.customerId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          search: filters.search || undefined,
        },
      });
      if (response.status && response.data) {
        const blob = new Blob([response.data.data as string], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = response.data.filename || `loyalty_export_${new Date().toISOString().slice(0, 10)}.csv`;
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

  const handleBulkExport = () => {
    const selectedTransactions = transactions.filter((t) => selectedIds.includes(t.id));
    if (selectedTransactions.length === 0) {
      dialogs.warning("No items selected for export.");
      return;
    }
    const headers = ["ID", "Customer", "Type", "Points", "Date", "Notes"];
    const rows = selectedTransactions.map((t) => [
      t.id,
      t.customer?.name || `Customer #${t.customerId}`,
      t.pointsChange > 0 ? "Earn" : "Redeem",
      t.pointsChange,
      new Date(t.timestamp).toLocaleString(),
      t.notes || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_loyalty_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dialogs.success("Export completed.");
  };

  const handleClearSelection = () => setSelectedIds([]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">⭐</span>
            Loyalty Program Management
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Track customer loyalty points, transactions, and rewards
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
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors"
            title={showAnalytics ? "Hide analytics" : "Show analytics"}
          >
            {showAnalytics ? <EyeOff style={{ color: "var(--text-primary)" }} className="w-4 h-4" /> : <Eye style={{ color: "var(--text-primary)" }} className="w-4 h-4" />}
          </button>
          <button
            onClick={handleExportAll}
            disabled={exporting || transactions.length === 0}
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
            onClick={adjustmentDialog.open}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors shadow-md font-medium"
          >
            <Plus className="w-4 h-4" />
            Adjust Points
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {showStats && <SummaryCards statistics={statistics} loading={loading} />}

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
          <p className="text-[var(--text-primary)] font-medium">Error loading loyalty data</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
          <button
            onClick={() => reload({ page: 1, limit })}
            className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <LoyaltyTransactionsTable
            transactions={transactions}
            onViewCustomer={viewDialog.open}
            selectedIds={selectedIds}
            onSelectRow={(id, checked) => {
              setSelectedIds((prev) =>
                checked ? [...prev, id] : prev.filter((i) => i !== id)
              );
            }}
            onSelectAll={(checked) => {
              setSelectedIds(checked ? transactions.map((t) => t.id) : []);
            }}
          />

          {/* Analytics Section */}
          {showAnalytics && (
            <div className="mt-8">
              <LoyaltyAnalytics
                pointsDistribution={pointsDistribution}
                monthlyTrends={monthlyTrends}
                topCustomers={topCustomers}
              />
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <LoyaltyAdjustmentDialog
        isOpen={adjustmentDialog.isOpen}
        onClose={adjustmentDialog.close}
        onSuccess={() => {
          adjustmentDialog.close();
          reload({ page, limit });
        }}
      />

      <CustomerLoyaltyViewDialog
        isOpen={viewDialog.isOpen}
        customer={viewDialog.customer}
        transactions={viewDialog.transactions}
        loading={viewDialog.loading}
        onClose={viewDialog.close}
      />
    </div>
  );
};

export default CustomerLoyaltyPage;