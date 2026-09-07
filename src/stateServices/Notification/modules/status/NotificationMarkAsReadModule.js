// src/stateServices/notification/modules/status/NotificationMarkAsReadModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * NotificationMarkAsReadModule - Handles side effects when a notification is marked as read.
 * Includes UI broadcast.
 */
class NotificationMarkAsReadModule {
  /**
   * Handle mark as read side effects
   * @param {Object} notification - The updated notification entity
   * @param {string} user - User performing the action
   */
  async handle(notification, user = "system") {
    logger.info(`[NotificationMarkAsRead] Notification #${notification.id} marked as read by ${user}`);

    // 1. Broadcast to UI for read status update
    this._broadcastRead(notification);
  }

  /**
   * Broadcast read status to UI
   * @private
   */
  _broadcastRead(notification) {
    UIBroadcaster.notification("read", {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      isRead: true,
      updatedAt: notification.updatedAt,
    });
  }
}

module.exports = NotificationMarkAsReadModule;