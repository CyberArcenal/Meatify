// src/renderer/pages/sales/transactions/index.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  PlusCircle,
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
  Filter,
  Eye,
  EyeOff,
} from "lucide-react";
import { format } from "date-fns";
import { useTransactions, type TransactionFilters } from "./hooks/useTransactions";
import { useTransactionDetails } from "./hooks/useTransactionDetails";
import { FilterBar } from "./components/FilterBar";
import { SummaryCards } from "./components/SummaryCards";
import { TransactionsTable } from "./components/TransactionsTable";
import { TransactionDetailsDrawer } from "./components/TransactionDetailsDrawer";
import { usePagination } from "../../contexts/PaginationContext";
import type { Sale } from "../../api/core/sale";
import { hideLoading, showLoading } from "../../utils/notification";
import { dialogs } from "../../utils/dialogs";
import saleAPI from "../../api/core/sale";
import { PromptDialog } from "../../components/Shared/PromptDialog";
import { useNavigate } from "react-router-dom";

const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    transactions,
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
  } = useTransactions({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    search: "",
    paymentMethod: "",
    status: "",
  });

  const { selectedTransaction, detailsOpen, openDetails, closeDetails } =
    useTransactionDetails();

  const [showStats, setShowStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  const hasFilters = !!(
    filters.search ||
    filters.paymentMethod ||
    filters.status ||
    filters.startDate !== format(new Date(), "yyyy-MM-dd") ||
    filters.endDate !== format(new Date(), "yyyy-MM-dd")
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
  const handleFilterChange = (key: keyof TransactionFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    // Page will be reset to 1 via useTransactions effect
  };

  // ─── Action Handlers ────────────────────────────────────────────
  const handlePrint = async (transaction: Sale) => {
    try {
      showLoading("Printing receipt...");
      await window.backendAPI.printerPrint(transaction);
      await dialogs.success("Receipt printed successfully.", "Success");
    } catch (err) {
      hideLoading();
      await dialogs.error("Printer unavailable.", "Printer Error");
    } finally {
      hideLoading();
    }
  };

  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingRefundTransaction, setPendingRefundTransaction] = useState<Sale | null>(null);

  const handleRefund = (transaction: Sale) => {
    dialogs
      .confirm({
        title: "Process Refund",
        message: `Refund transaction #${transaction.id}?`,
      })
      .then((confirmed) => {
        if (confirmed) {
          setPendingRefundTransaction(transaction);
          setPromptOpen(true);
        }
      });
  };

  const handleRefundConfirm = async (reason: string) => {
    if (!pendingRefundTransaction) return;
    try {
      const response = await saleAPI.refund(pendingRefundTransaction.id, reason);
      if (response.status) {
        await reload({ page, limit });
        await dialogs.success("Refund processed successfully.", "Success");
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      console.error("Refund failed:", err);
      await dialogs.error("Refund failed. Please try again.", "Error");
    } finally {
      setPendingRefundTransaction(null);
      setPromptOpen(false);
    }
  };

  const handleNewSale = () => {
    navigate("/pos/cashier");
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await saleAPI.export({
        format: "csv",
        filters: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          paymentMethod: filters.paymentMethod || undefined,
          status: filters.status || undefined,
        },
      });
      if (response.status) {
        const blob = new Blob([response.data.data], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = response.data.filename || `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        dialogs.success("Export completed.");
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      await dialogs.error("Export failed", err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleRefresh = () => {
    reload({ page, limit });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-gold)]">💰</span>
            Transactions
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            View and manage all sales transactions
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
            onClick={handleExport}
            disabled={exporting || transactions.length === 0}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors disabled:opacity-50"
            title="Export (current filters)"
          >
            <Download className={`w-4 h-4 ${exporting ? "animate-pulse" : ""}`} />
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleNewSale}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors shadow-md font-medium"
          >
            <PlusCircle className="w-4 h-4" />
            New Sale
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
          onReload={handleRefresh}
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
          <p className="text-[var(--text-primary)] font-medium">Error loading transactions</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
          <button
            onClick={() => reload({ page: 1, limit })}
            className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <TransactionsTable
          transactions={transactions}
          onViewDetails={openDetails}
          onPrint={handlePrint}
          onRefund={handleRefund}
        />
      )}

      {/* Transaction Details Drawer */}
      <TransactionDetailsDrawer
        transaction={selectedTransaction}
        isOpen={detailsOpen}
        onClose={closeDetails}
        onPrint={handlePrint}
        onRefund={handleRefund}
      />

      {/* Refund Reason Prompt */}
      <PromptDialog
        isOpen={promptOpen}
        onClose={() => {
          setPromptOpen(false);
          setPendingRefundTransaction(null);
        }}
        onConfirm={handleRefundConfirm}
        title="Refund Reason"
        message="Please provide a reason for this refund:"
        placeholder="Enter reason..."
      />
    </div>
  );
};

export default TransactionsPage;