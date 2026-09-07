// src/stateServices/notification/modules/NotificationAuditModule.js
const AuditLogger = require("../../common/AuditLogger");

/**
 * NotificationAuditModule - Handles audit logging for notification events.
 * Delegates to the common AuditLogger.
 */
class NotificationAuditModule {
  /**
   * Log notification creation
   * @param {number} notificationId - The notification ID
   * @param {Object} notification - The notification entity
   * @param {string} user - User performing the action
   */
  async logCreated(notificationId, notification, user = "system") {
    await AuditLogger.logCreate("Notification", notificationId, notification, user);
  }

  /**
   * Log notification mark as read
   * @param {number} notificationId - The notification ID
   * @param {Object} notification - The notification entity
   * @param {string} user - User performing the action
   */
  async logMarkAsRead(notificationId, notification, user = "system") {
    await AuditLogger.logUpdate(
      "Notification",
      notificationId,
      { isRead: false },
      { isRead: true },
      user
    );
  }

  /**
   * Log notification mark as unread
   * @param {number} notificationId - The notification ID
   * @param {Object} notification - The notification entity
   * @param {string} user - User performing the action
   */
  async logMarkAsUnread(notificationId, notification, user = "system") {
    await AuditLogger.logUpdate(
      "Notification",
      notificationId,
      { isRead: true },
      { isRead: false },
      user
    );
  }

  /**
   * Log notification update (generic)
   * @param {number} notificationId - The notification ID
   * @param {Object} changes - The changes made
   * @param {Object} notification - The updated notification entity
   * @param {string} user - User performing the action
   */
  async logUpdated(notificationId, changes, notification, user = "system") {
    await AuditLogger.logUpdate("Notification", notificationId, changes, notification, user);
  }

  /**
   * Log notification deletion
   * @param {number} notificationId - The notification ID
   * @param {Object} notification - The notification entity
   * @param {string} user - User performing the action
   */
  async logDeleted(notificationId, notification, user = "system") {
    await AuditLogger.logDelete("Notification", notificationId, notification, user);
  }

  /**
   * Log notification restore
   * @param {number} notificationId - The notification ID
   * @param {Object} notification - The restored notification entity
   * @param {string} user - User performing the action
   */
  async logRestored(notificationId, notification, user = "system") {
    await AuditLogger.logUpdate(
      "Notification",
      notificationId,
      { deletedAt: notification.deletedAt },
      { deletedAt: null },
      user
    );
  }

  /**
   * Log mark all as read for a user
   * @param {number} userId - The user ID
   * @param {number} count - Number of notifications marked
   * @param {string} user - User performing the action
   */
  async logMarkAllAsRead(userId, count, user = "system") {
    await AuditLogger.logUpdate(
      "Notification",
      null,
      { userId, previousStatus: "unread" },
      { userId, newStatus: "read all", count },
      user
    );
  }

  /**
   * Log mark all as unread for a user
   * @param {number} userId - The user ID
   * @param {number} count - Number of notifications marked
   * @param {string} user - User performing the action
   */
  async logMarkAllAsUnread(userId, count, user = "system") {
    await AuditLogger.logUpdate(
      "Notification",
      null,
      { userId, previousStatus: "read" },
      { userId, newStatus: "unread all", count },
      user
    );
  }

  /**
   * Log delete all read for a user
   * @param {number} userId - The user ID
   * @param {number} count - Number of notifications deleted
   * @param {number[]} ids - The deleted notification IDs
   * @param {string} user - User performing the action
   */
  async logDeleteAllRead(userId, count, ids, user = "system") {
    await AuditLogger.logUpdate(
      "Notification",
      null,
      { userId, action: "delete all read" },
      { userId, deletedCount: count, ids },
      user
    );
  }
}

module.exports = NotificationAuditModule;