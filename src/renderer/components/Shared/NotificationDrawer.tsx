// src/renderer/components/Shared/NotificationDrawer.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Bell,
  CheckCheck,
  CircleOff,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import notificationAPI, {
  type Notification,
} from "../../api/core/notification";
import { dialogs } from "../../utils/dialogs";

// TODO: Replace with actual auth context
const CURRENT_USER_ID = 1;

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState<{
    markRead: boolean;
    markUnread: boolean;
    deleteRead: boolean;
  }>({
    markRead: false,
    markUnread: false,
    deleteRead: false,
  });
  const limit = 15;

  // Track if initial load has been done
  const initialLoadDone = useRef(false);

  // Reset state when drawer opens
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setNotifications([]);
      setTotalPages(0);
      setTotalItems(0);
      initialLoadDone.current = false;
      fetchUnreadCount();
    }
  }, [isOpen]);

  // Fetch notifications when page changes (only if drawer is open)
  useEffect(() => {
    if (!isOpen) return;
    if (page === 1 && !initialLoadDone.current) {
      fetchNotifications(true);
    } else if (page > 1) {
      fetchNotifications(false);
    }
  }, [page, isOpen]);

  const fetchNotifications = async (reset: boolean = true) => {
    if (reset) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await notificationAPI.getAll({
        userId: CURRENT_USER_ID, // ✅ Filter by current user
        page,
        limit,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });

      if (response.status) {
        const data = response.data;
        const items = data.items || [];
        const total = data.total || 0;
        const totalPages = data.totalPages || 0;

        setNotifications((prev) => (reset ? items : [...prev, ...items]));
        setTotalItems(total);
        setTotalPages(totalPages);

        if (reset) {
          initialLoadDone.current = true;
        }
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load notifications");
      if (reset) {
        initialLoadDone.current = false;
      }
    } finally {
      if (reset) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationAPI.getUnreadCount(CURRENT_USER_ID);
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch unread count", err);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      const response = await notificationAPI.markAsRead(id);
      if (response.status) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
    }
  };

  // ─── BULK ACTIONS ──────────────────────────────────────────────

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) {
      dialogs.alert({ title: "Info", message: "No unread notifications to mark." });
      return;
    }

    setActionLoading((prev) => ({ ...prev, markRead: true }));
    try {
      const response = await notificationAPI.markAllAsRead(CURRENT_USER_ID);
      if (response.status) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        await dialogs.success("All notifications marked as read.");
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
    } finally {
      setActionLoading((prev) => ({ ...prev, markRead: false }));
    }
  };

  const handleMarkAllAsUnread = async () => {
    const readCount = notifications.filter((n) => n.isRead).length;
    if (readCount === 0) {
      dialogs.alert({ title: "Info", message: "No read notifications to mark as unread." });
      return;
    }

    setActionLoading((prev) => ({ ...prev, markUnread: true }));
    try {
      const response = await notificationAPI.markAllAsUnread(CURRENT_USER_ID);
      if (response.status) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: false })));
        setUnreadCount(notifications.length);
        await dialogs.success("All notifications marked as unread.");
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
    } finally {
      setActionLoading((prev) => ({ ...prev, markUnread: false }));
    }
  };

  const handleDeleteAllRead = async () => {
    const readCount = notifications.filter((n) => n.isRead).length;
    if (readCount === 0) {
      dialogs.alert({ title: "Info", message: "No read notifications to delete." });
      return;
    }

    const confirmed = await dialogs.confirm({
      title: "Delete All Read",
      message: `Are you sure you want to delete all ${readCount} read notifications? This action cannot be undone.`,
    });
    if (!confirmed) return;

    setActionLoading((prev) => ({ ...prev, deleteRead: true }));
    try {
      const response = await notificationAPI.deleteAllRead(CURRENT_USER_ID);
      if (response.status) {
        setNotifications((prev) => prev.filter((n) => !n.isRead));
        // Unread count remains unchanged
        await dialogs.success(`${response.data.count} read notifications deleted.`);
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
    } finally {
      setActionLoading((prev) => ({ ...prev, deleteRead: false }));
    }
  };

  // ─── SINGLE DELETE ──────────────────────────────────────────────

  const handleDelete = async (id: number) => {
    const confirmed = await dialogs.confirm({
      title: "Delete Notification",
      message: "Are you sure you want to delete this notification?",
    });
    if (!confirmed) return;

    try {
      const response = await notificationAPI.delete(id);
      if (response.status) {
        const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
    }
  };

  const loadMore = () => {
    if (page < totalPages && !loading && !loadingMore) {
      setPage((prev) => prev + 1);
    }
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const isLongMessage = (message: string) => message.length > 100;

  const getTypeIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />;
      case "warning":
        return <div className="w-2 h-2 rounded-full bg-[var(--accent-amber)]" />;
      case "error":
        return <div className="w-2 h-2 rounded-full bg-[var(--accent-red)]" />;
      case "info":
        return <div className="w-2 h-2 rounded-full bg-[var(--accent-gold)]" />;
      case "purchase":
        return <div className="w-2 h-2 rounded-full bg-[var(--accent-purple)]" />;
      case "sale":
        return <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]" />;
    }
  };

  if (!isOpen) return null;

  const hasMore = page < totalPages;
  const readCount = notifications.filter((n) => n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-[var(--card-bg)] border-l border-[var(--border-color)] shadow-xl transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--card-secondary-bg)]">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[var(--accent-gold)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-[var(--accent-gold)]">
                    ({unreadCount} unread)
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[var(--card-hover-bg)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-tertiary)]" />
            </button>
          </div>

          {/* Enhanced Actions Bar */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)] bg-[var(--card-secondary-bg)]">
              <span className="text-xs text-[var(--text-tertiary)]">
                {totalItems} total · {readCount} read
              </span>
              <div className="flex items-center gap-1">
                {/* Mark All as Read */}
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0 || actionLoading.markRead}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--accent-gold)] hover:bg-[var(--accent-gold-light)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Mark all as read"
                >
                  {actionLoading.markRead ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Mark read</span>
                </button>

                {/* Mark All as Unread */}
                <button
                  onClick={handleMarkAllAsUnread}
                  disabled={readCount === 0 || actionLoading.markUnread}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Mark all as unread"
                >
                  {actionLoading.markUnread ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CircleOff className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Mark unread</span>
                </button>

                {/* Delete All Read */}
                <button
                  onClick={handleDeleteAllRead}
                  disabled={readCount === 0 || actionLoading.deleteRead}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--accent-red)] hover:bg-[var(--accent-red-light)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Delete all read notifications"
                >
                  {actionLoading.deleteRead ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Delete read</span>
                </button>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-gold)]" />
              </div>
            ) : error ? (
              <div className="text-center p-6">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-[var(--accent-red)]" />
                <p className="text-sm text-[var(--text-primary)]">{error}</p>
                <button
                  onClick={() => {
                    setPage(1);
                    setNotifications([]);
                    initialLoadDone.current = false;
                    fetchNotifications(true);
                  }}
                  className="mt-3 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg text-sm hover:bg-[var(--accent-gold-hover)] transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-[var(--text-tertiary)]">
                <div className="w-16 h-16 rounded-full bg-[var(--card-secondary-bg)] flex items-center justify-center mb-3 border border-[var(--border-color)]">
                  <Bell className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  No notifications yet
                </p>
                <p className="text-xs mt-1">
                  When you get notifications, they'll appear here.
                </p>
              </div>
            ) : (
              <>
                {notifications.map((notification) => {
                  const expanded = expandedIds.has(notification.id);
                  const longMessage = isLongMessage(notification.message);

                  return (
                    <div
                      key={notification.id}
                      className={`group relative p-3 rounded-xl border transition-all duration-200 ${
                        notification.isRead
                          ? "border-[var(--border-color)] bg-[var(--card-secondary-bg)]"
                          : "border-[var(--accent-gold)]/50 bg-[var(--accent-gold-light)] shadow-sm"
                      } hover:shadow-md`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getTypeIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-sm font-medium ${
                                notification.isRead
                                  ? "text-[var(--text-secondary)]"
                                  : "text-[var(--text-primary)]"
                              }`}
                            >
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--accent-gold)] text-white flex-shrink-0">
                                New
                              </span>
                            )}
                          </div>

                          {/* Message with expand/collapse */}
                          <div className="mt-1">
                            <p
                              className={`text-xs leading-relaxed ${
                                !expanded ? "line-clamp-2" : ""
                              }`}
                              style={{
                                color: notification.isRead
                                  ? "var(--text-tertiary)"
                                  : "var(--text-secondary)",
                              }}
                            >
                              {notification.message}
                            </p>
                            {longMessage && (
                              <button
                                onClick={() => toggleExpanded(notification.id)}
                                className="mt-1 text-xs text-[var(--accent-gold)] hover:underline flex items-center gap-1 transition-colors"
                              >
                                {expanded ? (
                                  <>
                                    Show less <ChevronUp className="w-3 h-3" />
                                  </>
                                ) : (
                                  <>
                                    Read more{" "}
                                    <ChevronDown className="w-3 h-3" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-[var(--text-tertiary)] mt-2">
                            {format(
                              new Date(notification.createdAt),
                              "MMM dd, yyyy • hh:mm a"
                            )}
                          </p>

                          {/* Metadata - only show when expanded */}
                          {notification.metadata && expanded && (
                            <div className="mt-2 text-xs text-[var(--text-tertiary)] bg-[var(--card-bg)] p-2 rounded-lg border border-[var(--border-color)] overflow-auto max-h-32">
                              <pre className="whitespace-pre-wrap break-words">
                                {JSON.stringify(notification.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-1.5 hover:bg-[var(--card-hover-bg)] rounded-lg transition-colors"
                              title="Mark as read"
                            >
                              <CheckCheck className="w-4 h-4 text-[var(--accent-gold)]" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-1.5 hover:bg-[var(--status-cancelled-bg)] rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-[var(--accent-red)]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Load more */}
                {hasMore && (
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full py-2.5 text-sm font-medium text-[var(--accent-gold)] hover:bg-[var(--accent-gold-light)] rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      `Load more (${notifications.length}/${totalItems})`
                    )}
                  </button>
                )}

                {/* End of list */}
                {!hasMore && notifications.length > 0 && (
                  <div className="text-center py-3 text-xs text-[var(--text-tertiary)] border-t border-[var(--border-color)] mt-2">
                    You've seen all {totalItems} notifications
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};