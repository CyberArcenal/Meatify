// src/stateServices/notification/modules/status/NotificationDeletedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * NotificationDeletedModule - Handles side effects when a notification is soft-deleted.
 * Includes UI broadcast.
 */
class NotificationDeletedModule {
  /**
   * Handle notification deletion side effects
   * @param {number} notificationId - The notification ID
   * @param {Object} notification - The notification entity (if available)
   * @param {string} user - User performing the action
   */
  async handle(notificationId, notification, user = "system") {
    logger.info(`[NotificationDeleted] Notification #${notificationId} soft-deleted by ${user}`);

    // 1. Broadcast to UI
    this._broadcastDeleted(notificationId, notification);
  }

  /**
   * Broadcast deleted notification to UI
   * @private
   */
  _broadcastDeleted(notificationId, notification) {
    UIBroadcaster.notification("deleted", {
      id: notificationId,
      userId: notification?.userId,
      title: notification?.title,
      deletedAt: new Date().toISOString(),
    });
  }
}

module.exports = NotificationDeletedModule;