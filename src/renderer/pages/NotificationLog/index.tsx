// src/renderer/pages/system/notification-logs/index.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useNotificationLogs, type NotificationFilters } from "./hooks/useNotificationLogs";
import { SummaryCards } from "./components/SummaryCards";
import { FilterBar } from "./components/FilterBar";
import { NotificationTable } from "./components/NotificationTable";
import { NotificationViewDialog } from "./Dialogs/NotificationViewDialog";
import BulkActionsBar from "./components/BulkActionsBar";
import { usePagination } from "../../contexts/PaginationContext";
import notificationLogAPI from "../../api/core/notificationLog";
import { dialogs } from "../../utils/dialogs";

const NotificationLogPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const {
    logs,
    filters,
    setFilters,
    loading,
    error,
    totalItems,
    page,
    limit,
    stats,
    reload,
    goToPage,
    changeLimit,
    resetFilters,
  } = useNotificationLogs({
    sortBy: "created_at",
    sortOrder: "DESC",
  });

  const [showStats, setShowStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);
  const [sendingIds, setSendingIds] = useState<Set<number>>(new Set());

  // Dialog state
  const [viewLog, setViewLog] = useState<NotificationLog | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const hasFilters = !!(
    filters.keyword ||
    filters.status ||
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
    (key: keyof NotificationFilters, value: any) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters]
  );

  // ─── Action Handlers ────────────────────────────────────────────
  const handleView = (log: NotificationLog) => {
    setViewLog(log);
    setIsViewDialogOpen(true);
  };

  const handleRetry = async (id: number) => {
    setSendingIds((prev) => new Set(prev).add(id));
    try {
      const response = await notificationLogAPI.retry(id);
      if (response.status) {
        dialogs.success("Notification queued for retry.");
        reload({ page, limit });
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      dialogs.error(err.message || "Unable to retry notification");
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleResend = async (id: number) => {
    setSendingIds((prev) => new Set(prev).add(id));
    try {
      const response = await notificationLogAPI.resend(id);
      if (response.status) {
        dialogs.success("Notification resent.");
        reload({ page, limit });
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      dialogs.error(err.message || "Unable to resend notification");
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await dialogs.confirm({
      title: "Delete Notification",
      message: `Are you sure you want to delete notification #${id}?`,
      confirmText: "Delete",
      icon: "danger",
    });
    if (!confirmed) return;

    try {
      const response = await notificationLogAPI.delete(id);
      if (response.status) {
        dialogs.success(`Notification #${id} deleted.`);
        reload({ page, limit });
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      dialogs.error(err.message || "Delete failed.");
    }
  };

  // ─── Bulk Actions ───────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Delete",
      message: `Delete ${selectedIds.length} selected notification${selectedIds.length !== 1 ? "s" : ""}?`,
      confirmText: "Delete All",
      icon: "danger",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => notificationLogAPI.delete(id)));
      dialogs.success(`${selectedIds.length} notification${selectedIds.length !== 1 ? "s" : ""} deleted.`);
      setSelectedIds([]);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Bulk delete failed.");
    }
  };

  const handleBulkRetry = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Retry",
      message: `Retry ${selectedIds.length} selected failed notification${selectedIds.length !== 1 ? "s" : ""}?`,
      confirmText: "Retry All",
      icon: "warning",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => notificationLogAPI.retry(id)));
      dialogs.success(`${selectedIds.length} notification${selectedIds.length !== 1 ? "s" : ""} queued for retry.`);
      setSelectedIds([]);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Bulk retry failed.");
    }
  };

  const handleBulkResend = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Resend",
      message: `Resend ${selectedIds.length} selected notification${selectedIds.length !== 1 ? "s" : ""}?`,
      confirmText: "Resend All",
      icon: "info",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => notificationLogAPI.resend(id)));
      dialogs.success(`${selectedIds.length} notification${selectedIds.length !== 1 ? "s" : ""} resent.`);
      setSelectedIds([]);
      reload({ page, limit });
    } catch (err: any) {
      dialogs.error(err.message || "Bulk resend failed.");
    }
  };

  const handleBulkExport = () => {
    const selectedLogs = logs.filter((l) => selectedIds.includes(l.id));
    if (selectedLogs.length === 0) {
      dialogs.warning("No items selected for export.");
      return;
    }
    const headers = ["ID", "Recipient", "Subject", "Status", "Retry Count", "Resend Count", "Sent At", "Created At"];
    const rows = selectedLogs.map((l) => [
      l.id,
      l.recipient_email,
      l.subject || "",
      l.status,
      l.retry_count,
      l.resend_count,
      l.sent_at || "",
      l.created_at,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_notifications_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dialogs.success("Export completed.");
  };

  const handleClearSelection = () => setSelectedIds([]);

  // ─── Full Export ────────────────────────────────────────────────
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const response = await notificationLogAPI.export({
        format: "csv",
        filters: {
          status: filters.status,
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      });
      if (response.status && response.data) {
        const blob = new Blob([response.data.data as string], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = response.data.filename || `notifications_export_${new Date().toISOString().slice(0, 10)}.csv`;
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
            <span className="text-[var(--accent-gold)]">📬</span>
            Notification Logs
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            View and manage all sent notification records
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
            disabled={exporting || logs.length === 0}
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
        </div>
      </div>

      {/* Summary Cards */}
      {showStats && <SummaryCards stats={stats} loading={loading} />}

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
          onRetryAll={handleBulkRetry}
          onResendAll={handleBulkResend}
          onDeleteAll={handleBulkDelete}
          onExport={handleBulkExport}
          onClearSelection={handleClearSelection}
          showRetryAll={selectedIds.some((id) => logs.find((l) => l.id === id)?.status === "failed")}
          showResendAll={selectedIds.some((id) => logs.find((l) => l.id === id)?.status === "sent" || logs.find((l) => l.id === id)?.status === "resend")}
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
          <p className="text-[var(--text-primary)] font-medium">Error loading notification logs</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
          <button
            onClick={() => reload({ page: 1, limit })}
            className="mt-4 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <NotificationTable
          logs={logs}
          onView={handleView}
          onRetry={handleRetry}
          onResend={handleResend}
          onDelete={handleDelete}
          sendingIds={sendingIds}
          selectedIds={selectedIds}
          onSelectRow={(id, checked) => {
            setSelectedIds((prev) =>
              checked ? [...prev, id] : prev.filter((i) => i !== id)
            );
          }}
          onSelectAll={(checked) => {
            setSelectedIds(checked ? logs.map((l) => l.id) : []);
          }}
        />
      )}

      {/* View Dialog */}
      <NotificationViewDialog
        log={viewLog}
        isOpen={isViewDialogOpen}
        onClose={() => {
          setIsViewDialogOpen(false);
          setViewLog(null);
        }}
      />
    </div>
  );
};

export default NotificationLogPage;