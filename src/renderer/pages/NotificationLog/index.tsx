// src/renderer/pages/system/notification-logs/index.tsx
import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import notificationLogAPI, { type NotificationLog } from "../../api/core/notificationLog";
import { usePagination } from "../../contexts/PaginationContext";
import { dialogs } from "../../utils/dialogs";
import { showError, showSuccess } from "../../utils/notification";
import { NotificationStats } from "./components/NotificationStats";
import { NotificationTable } from "./components/NotificationTable";
import { NotificationViewDialog } from "./Dialogs/NotificationViewDialog";
import { useNotificationLogs, type NotificationFilters } from "./hooks/useNotificationLogs";
import { NotificationFilterBar } from "./components/NotificationFilterBar";

const NotificationLogPage: React.FC = () => {
  const { pagination, setPagination, clearPagination } = usePagination();

  const { logs, filters, setFilters, loading, error, reload, stats, totalItems } =
    useNotificationLogs({
      sortBy: "created_at",
      sortOrder: "DESC",
    });

  // Dialog state
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [sendingRows, setSendingRows] = useState<Set<number>>(new Set());

  // ✅ Sync with global pagination - gaya ng Category page
  useEffect(() => {
    // ✅ Ensure totalItems is a number (0 if no data)
    const safeTotalItems = totalItems || 0;
    
    setPagination({
      currentPage: pagination.currentPage,
      totalItems: safeTotalItems,
      pageSize: pagination.pageSize,
      onPageChange: (page) => {
        reload({ page, limit: pagination.pageSize });
      },
      onPageSizeChange: (size) => {
        reload({ page: 1, limit: size });
      },
      pageSizeOptions: [10, 20, 50, 100],
      // ✅ Only show page size selector if there are items
      showPageSize: safeTotalItems > 0,
    });

    return () => clearPagination();
  }, [totalItems, pagination.currentPage, pagination.pageSize]); // ✅ Walang reload dito

  // ✅ Gaya ng Category page - nagre-reload agad kapag nagbago ang filter
  const handleFilterChange = (key: keyof NotificationFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    reload({ page: 1, limit: pagination.pageSize });
  };

  const handleView = (log: NotificationLog) => {
    setSelectedLog(log);
    setIsViewDialogOpen(true);
  };

  const handleRetry = async (id: number) => {
    setSendingRows((prev) => new Set(prev).add(id));
    try {
      const response = await notificationLogAPI.retry(id);
      if (response.status) {
        showSuccess("Notification queued for retry.");
        reload({ page: pagination.currentPage, limit: pagination.pageSize });
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      showError("Retry failed", err.message || "Unable to retry notification");
    } finally {
      setSendingRows((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const confirmRetry = (id: number) => {
    dialogs
      .confirm({
        title: "Retry Notification",
        message: "Are you sure you want to retry this failed notification?",
        confirmText: "Retry",
        cancelText: "Cancel",
        icon: "warning",
      })
      .then((confirmed) => {
        if (confirmed) handleRetry(id);
      });
  };

  const handleResend = async (id: number) => {
    setSendingRows((prev) => new Set(prev).add(id));
    try {
      const response = await notificationLogAPI.resend(id);
      if (response.status) {
        showSuccess("Notification resent.");
        reload({ page: pagination.currentPage, limit: pagination.pageSize });
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      showError("Resend failed", err.message || "Unable to resend notification");
    } finally {
      setSendingRows((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const confirmResend = (id: number) => {
    dialogs
      .confirm({
        title: "Resend Notification",
        message: "Are you sure you want to resend this notification?",
        confirmText: "Resend",
        cancelText: "Cancel",
        icon: "info",
      })
      .then((confirmed) => {
        if (confirmed) handleResend(id);
      });
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await notificationLogAPI.delete(id);
      if (response.status) {
        dialogs.success("Deleted", `Notification #${id} has been deleted.`);
        reload({ page: pagination.currentPage, limit: pagination.pageSize });
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      dialogs.error("Delete failed", err.message);
    }
  };

  const confirmDelete = (id: number) => {
    dialogs
      .delete()
      .then((confirmed) => {
        if (confirmed) handleDelete(id);
      });
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
            Notification Logs
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {totalItems || 0} total notifications
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-[var(--card-secondary-bg)] rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors flex items-center gap-2 text-[var(--text-primary)] border border-[var(--border-color)]"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {!loading && !error && <NotificationStats stats={stats} />}

      {/* Filter Bar */}
      <NotificationFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={() => {
          setFilters({
            sortBy: "created_at",
            sortOrder: "DESC",
          });
          reload({ page: 1, limit: pagination.pageSize });
        }}
        onRefresh={handleRefresh}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4 text-red-400">
          {error}
          <button
            onClick={() => reload({ page: 1, limit: pagination.pageSize })}
            className="ml-3 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 mt-4">
        <NotificationTable
          logs={logs}
          onView={handleView}
          onRetry={confirmRetry}
          onResend={confirmResend}
          onDelete={confirmDelete}
          isLoading={loading}
          sendingIds={sendingRows}
        />
      </div>

      {/* View Dialog */}
      {selectedLog && (
        <NotificationViewDialog
          log={selectedLog}
          isOpen={isViewDialogOpen}
          onClose={() => {
            setIsViewDialogOpen(false);
            setSelectedLog(null);
          }}
        />
      )}
    </div>
  );
};

export default NotificationLogPage;