// src/stateServices/notification/modules/status/NotificationMarkAsUnreadModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * NotificationMarkAsUnreadModule - Handles side effects when a notification is marked as unread.
 * Includes UI broadcast.
 */
class NotificationMarkAsUnreadModule {
  /**
   * Handle mark as unread side effects
   * @param {Object} notification - The updated notification entity
   * @param {string} user - User performing the action
   */
  async handle(notification, user = "system") {
    logger.info(`[NotificationMarkAsUnread] Notification #${notification.id} marked as unread by ${user}`);

    // 1. Broadcast to UI for unread status update
    this._broadcastUnread(notification);
  }

  /**
   * Broadcast unread status to UI
   * @private
   */
  _broadcastUnread(notification) {
    UIBroadcaster.notification("unread", {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      isRead: false,
      updatedAt: notification.updatedAt,
    });
  }
}

module.exports = NotificationMarkAsUnreadModule;