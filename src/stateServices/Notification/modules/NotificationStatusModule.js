// src/stateServices/notification/modules/NotificationStatusModule.js
const { logger } = require("../../../utils/logger");

/**
 * NotificationStatusModule - Handles status validation for notification events.
 * Currently acts as a placeholder for future validation logic.
 *
 * FUTURE USE CASES:
 * - Validate if a notification can be marked as read/unread
 * - Validate if a notification can be deleted
 * - Check notification retention policies
 * - Validate notification types
 */
class NotificationStatusModule {
  /**
   * Validate if a notification can be marked as read
   * @param {Object} notification - The notification entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateMarkAsRead(notification, context = {}) {
    logger.debug(`[NotificationStatus] Validating mark as read for notification #${notification.id}`);

    if (notification.isRead) {
      return { valid: false, reason: "Notification is already read" };
    }

    return { valid: true };
  }

  /**
   * Validate if a notification can be marked as unread
   * @param {Object} notification - The notification entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateMarkAsUnread(notification, context = {}) {
    logger.debug(`[NotificationStatus] Validating mark as unread for notification #${notification.id}`);

    if (!notification.isRead) {
      return { valid: false, reason: "Notification is already unread" };
    }

    return { valid: true };
  }

  /**
   * Validate if a notification can be deleted
   * @param {Object} notification - The notification entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateDelete(notification, context = {}) {
    logger.debug(`[NotificationStatus] Validating deletion for notification #${notification.id}`);

    if (notification.deletedAt) {
      return { valid: false, reason: "Notification is already deleted" };
    }

    return { valid: true };
  }

  /**
   * Get notification status summary
   * @param {Object} notification - The notification entity
   * @returns {{ isRead: boolean; isDeleted: boolean; status: string }}
   */
  getStatusSummary(notification) {
    return {
      isRead: notification.isRead,
      isDeleted: !!notification.deletedAt,
      status: notification.deletedAt ? "deleted" : notification.isRead ? "read" : "unread",
    };
  }

  /**
   * Get valid notification types
   * @returns {string[]}
   */
  getValidTypes() {
    return ["info", "success", "warning", "error", "purchase", "sale"];
  }
}

module.exports = NotificationStatusModule;