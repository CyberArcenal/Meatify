// src/stateServices/Notification.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Notification = require("../entities/Notification");
const {
  BrowserWindow,
  Notification: ElectronNotification,
} = require("electron");

/**
 * NotificationStateService handles side effects for notification state changes.
 * It does NOT perform CRUD updates – those belong to NotificationService.
 * All methods here are event handlers (onCreate, onMarkAsRead, etc.)
 * and are called by the subscriber after a change is detected.
 *
 * ✅ Every method sends IPC events to the UI for real-time updates (toast popups, etc.)
 */
class NotificationStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.notificationRepo = dataSource.getRepository(Notification);
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    if (qr) {
      return qr.manager.getRepository(entityClass);
    }
    return this.dataSource.getRepository(entityClass);
  }

  /**
   * Send event to all renderer windows (UI)
   * @param {string} channel
   * @param {any} data
   */
  _sendToRenderers(channel, data) {
    try {
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send(channel, data);
        }
      });
    } catch (error) {
      // If running outside Electron (e.g., tests), ignore
      logger.warn(
        "[NotificationState] Failed to send IPC event (maybe not in Electron):",
        error.message,
      );
    }
  }

  /**
   * Show a native OS notification (system toast)
   * @param {string} title
   * @param {string} body
   * @param {Object} [options]
   * @param {string} [options.icon] - Path to icon file
   * @param {boolean} [options.silent] - Whether to play a sound
   */
  _sendNativeNotification(title, body, options = {}) {
    try {
      if (!ElectronNotification || !ElectronNotification.isSupported()) {
        logger.debug(
          "[NotificationState] Native notifications not supported in this environment.",
        );
        return;
      }

      const notif = new ElectronNotification({
        title: title,
        body: body,
        silent: options.silent ?? false,
        icon: options.icon ?? null,
      });
      notif.show();
    } catch (err) {
      // Non‑critical – log debug only
      logger.debug(
        "[NotificationState] Failed to show native notification:",
        err.message,
      );
    }
  }

  // ============================================================
  // 🔄 STATE TRANSITION SIDE EFFECTS (on...)
  // ============================================================

  /**
   * Side effect after a notification is created
   * Called from NotificationSubscriber.afterInsert
   * @param {number} notificationId
   * @param {Notification} notification - The created entity
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onCreate(
    notificationId,
    notification,
    user = "system",
    queryRunner = null,
  ) {
    logger.info(
      `[NotificationState] ✅ Notification #${notificationId} created by ${user}`,
    );

    // Broadcast to UI for toast popup
    this._sendToRenderers("notification:created", {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
    });

    // Show native OS notification (system toast)
    this._sendNativeNotification(
      notification.title,
      notification.message,
      { silent: notification.type === "info" }, // you can adjust based on type
    );

    // Audit log
    await auditLogger.logCreate(
      "Notification",
      notificationId,
      notification,
      user,
    );
  }

  /**
   * Side effect after a notification is marked as read
   * Called from NotificationSubscriber.afterUpdate
   * @param {number} notificationId
   * @param {Notification} updatedNotification - The updated entity
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMarkAsRead(
    notificationId,
    updatedNotification,
    user = "system",
    queryRunner = null,
  ) {
    // Broadcast to UI for read status update
    this._sendToRenderers("notification:read", {
      id: updatedNotification.id,
      userId: updatedNotification.userId,
      title: updatedNotification.title,
      isRead: true,
      updatedAt: updatedNotification.updatedAt,
    });

    // Audit log
    await auditLogger.logUpdate(
      "Notification",
      notificationId,
      { isRead: false },
      { isRead: true },
      user,
    );

    logger.info(
      `[NotificationState] ✅ Notification #${notificationId} marked as read (side effects applied)`,
    );
  }

  /**
   * Side effect after a notification is marked as unread
   * Called from NotificationSubscriber.afterUpdate
   * @param {number} notificationId
   * @param {Notification} updatedNotification
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMarkAsUnread(
    notificationId,
    updatedNotification,
    user = "system",
    queryRunner = null,
  ) {
    // Broadcast to UI for unread status update
    this._sendToRenderers("notification:unread", {
      id: updatedNotification.id,
      userId: updatedNotification.userId,
      title: updatedNotification.title,
      isRead: false,
      updatedAt: updatedNotification.updatedAt,
    });

    // Audit log
    await auditLogger.logUpdate(
      "Notification",
      notificationId,
      { isRead: true },
      { isRead: false },
      user,
    );

    logger.info(
      `[NotificationState] ✅ Notification #${notificationId} marked as unread (side effects applied)`,
    );
  }

  /**
   * Side effect after a notification is updated (generic)
   * Called from NotificationSubscriber.afterUpdate for other field changes
   * @param {number} notificationId
   * @param {Notification} updatedNotification
   * @param {Object} changes - The changes made
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onUpdate(
    notificationId,
    updatedNotification,
    changes,
    user = "system",
    queryRunner = null,
  ) {
    // Broadcast to UI
    this._sendToRenderers("notification:updated", {
      id: updatedNotification.id,
      userId: updatedNotification.userId,
      title: updatedNotification.title,
      changes,
      updatedAt: updatedNotification.updatedAt,
    });

    // Audit log
    await auditLogger.logUpdate(
      "Notification",
      notificationId,
      changes,
      updatedNotification,
      user,
    );

    logger.info(
      `[NotificationState] ✅ Notification #${notificationId} updated (side effects applied)`,
    );
  }

  /**
   * Side effect after a notification is soft-deleted
   * Called from NotificationSubscriber.afterRemove
   * @param {number} notificationId
   * @param {Notification} notification - The deleted entity
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onDelete(
    notificationId,
    notification,
    user = "system",
    queryRunner = null,
  ) {
    // Broadcast to UI
    this._sendToRenderers("notification:deleted", {
      id: notificationId,
      userId: notification?.userId,
      title: notification?.title,
      deletedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logCreate(
      "Notification",
      notificationId,
      notification,
      user,
    );

    logger.info(
      `[NotificationState] ✅ Notification #${notificationId} soft-deleted (side effects applied)`,
    );
  }

  /**
   * Side effect after a notification is restored
   * @param {number} notificationId
   * @param {Notification} restoredNotification
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onRestore(
    notificationId,
    restoredNotification,
    user = "system",
    queryRunner = null,
  ) {
    // Broadcast to UI
    this._sendToRenderers("notification:restored", {
      id: restoredNotification.id,
      userId: restoredNotification.userId,
      title: restoredNotification.title,
      restoredAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Notification",
      notificationId,
      { deletedAt: restoredNotification.deletedAt },
      { deletedAt: null },
      user,
    );

    logger.info(
      `[NotificationState] ✅ Notification #${notificationId} restored (side effects applied)`,
    );
  }

  /**
   * Side effect after all notifications for a user are marked as read
   * @param {number} userId
   * @param {Notification[]} updatedNotifications
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMarkAllAsRead(
    userId,
    updatedNotifications,
    user = "system",
    queryRunner = null,
  ) {
    const count = updatedNotifications.length;
    if (count > 0) {
      // Broadcast to UI
      this._sendToRenderers("notification:allRead", {
        userId,
        count,
        updatedAt: new Date().toISOString(),
        notificationIds: updatedNotifications.map((n) => n.id),
      });

      // Audit log
      await auditLogger.logUpdate(
        "Notification",
        null,
        { userId, previousStatus: "unread" },
        { userId, newStatus: "read all", count },
        user,
      );

      logger.info(
        `[NotificationState] ✅ Marked ${count} notifications as read for user #${userId} (side effects applied)`,
      );
    }
  }

  /**
   * Side effect after all notifications for a user are marked as unread
   * @param {number} userId
   * @param {Notification[]} updatedNotifications
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMarkAllAsUnread(
    userId,
    updatedNotifications,
    user = "system",
    queryRunner = null,
  ) {
    const count = updatedNotifications.length;
    if (count > 0) {
      // Broadcast to UI
      this._sendToRenderers("notification:allUnread", {
        userId,
        count,
        updatedAt: new Date().toISOString(),
        notificationIds: updatedNotifications.map((n) => n.id),
      });

      // Audit log
      await auditLogger.logUpdate(
        "Notification",
        null,
        { userId, previousStatus: "read" },
        { userId, newStatus: "unread all", count },
        user,
      );

      logger.info(
        `[NotificationState] ✅ Marked ${count} notifications as unread for user #${userId} (side effects applied)`,
      );
    }
  }

  /**
   * Side effect after all read notifications for a user are soft-deleted
   * @param {number} userId
   * @param {number[]} deletedIds
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onDeleteAllRead(
    userId,
    deletedIds,
    user = "system",
    queryRunner = null,
  ) {
    const count = deletedIds.length;
    if (count > 0) {
      // Broadcast to UI
      this._sendToRenderers("notification:allReadDeleted", {
        userId,
        count,
        deletedIds,
        deletedAt: new Date().toISOString(),
      });

      // Audit log
      await auditLogger.logUpdate(
        "Notification",
        null,
        { userId, action: "delete all read" },
        { userId, deletedCount: count, ids: deletedIds },
        user,
      );

      logger.info(
        `[NotificationState] ✅ Deleted ${count} read notifications for user #${userId} (side effects applied)`,
      );
    }
  }
}

module.exports = { NotificationStateService };
