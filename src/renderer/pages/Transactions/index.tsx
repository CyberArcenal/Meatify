// src/renderer/pages/sales/transactions/index.tsx
import React, { useState, useEffect } from "react";
import { PlusCircle, Download, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useTransactions, type TransactionFilters } from "./hooks/useTransactions";
import { useTransactionDetails } from "./hooks/useTransactionDetails";
import { FilterBar } from "./components/FilterBar";
import { SummaryMetrics } from "./components/SummaryMetrics";
import { TransactionsTable } from "./components/TransactionsTable";
import { TransactionDetailsDrawer } from "./components/TransactionDetailsDrawer";
import { usePagination } from "../../contexts/PaginationContext";
import type { Sale } from "../../api/core/sale";
import { hideLoading, showLoading } from "../../utils/notification";
import { dialogs } from "../../utils/dialogs";
import saleAPI from "../../api/core/sale";
import { PromptDialog } from "../../components/Shared/PromptDialog";

const TransactionsPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    transactions,       // filtered (for table)
    allTransactions,   // unfiltered (for stats)
    filters,
    setFilters,
    loading,
    error,
    reload,
  } = useTransactions({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    search: "",
    paymentMethod: "",
    status: "",
  });

  const { selectedTransaction, detailsOpen, openDetails, closeDetails } =
    useTransactionDetails();

  // Sync with global pagination
  useEffect(() => {
    setPagination({
      currentPage: pagination.currentPage,
      totalItems: allTransactions.length,
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
  }, [allTransactions.length, pagination.currentPage, pagination.pageSize]);

  // Prompt state for refund reason
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingRefundTransaction, setPendingRefundTransaction] =
    useState<Sale | null>(null);

  const handleFilterChange = (key: keyof TransactionFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    reload({ page: 1, limit: pagination.pageSize });
  };

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
        await reload({ page: pagination.currentPage, limit: pagination.pageSize });
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
    window.location.href = "/pos/cashier";
  };

  const handleExport = async () => {
    // Export functionality – adapt if needed
    try {
      const response = await saleAPI.export({
        startDate: filters.startDate,
        endDate: filters.endDate,
        paymentMethod: filters.paymentMethod || undefined,
        status: filters.status || undefined,
      });
      if (response.status) {
        const blob = new Blob([response.data.data], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = response.data.filename;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      await dialogs.alert({ title: "Export Failed", message: err.message });
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
            Transactions
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {allTransactions.length} total transactions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNewSale}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            New Sale
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--card-secondary-bg)] rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)] border border-[var(--border-color)]"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--card-secondary-bg)] rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors text-[var(--text-primary)] border border-[var(--border-color)]"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Metrics – uses allTransactions (unfiltered) */}
      <SummaryMetrics transactions={allTransactions} />

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReload={handleRefresh}
      />

      {/* Transactions Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[var(--accent-red)]" />
            <p className="text-[var(--text-primary)] font-medium">
              Error loading transactions
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
        <div className="flex-1 overflow-hidden">
          <TransactionsTable
            transactions={transactions}
            onViewDetails={openDetails}
            onPrint={handlePrint}
            onRefund={handleRefund}
          />
        </div>
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