// src/stateServices/notification/modules/status/NotificationMarkAllAsUnreadModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * NotificationMarkAllAsUnreadModule - Handles side effects when all notifications are marked as unread.
 * Includes UI broadcast.
 */
class NotificationMarkAllAsUnreadModule {
  /**
   * Handle mark all as unread side effects
   * @param {number} userId - The user ID
   * @param {Array} updatedNotifications - The updated notifications
   * @param {string} user - User performing the action
   */
  async handle(userId, updatedNotifications, user = "system") {
    const count = updatedNotifications.length;
    if (count === 0) return;

    logger.info(`[NotificationMarkAllAsUnread] Marked ${count} notifications as unread for user #${userId} by ${user}`);

    // 1. Broadcast to UI
    this._broadcastAllUnread(userId, count, updatedNotifications);
  }

  /**
   * Broadcast all unread to UI
   * @private
   */
  _broadcastAllUnread(userId, count, updatedNotifications) {
    UIBroadcaster.notification("allUnread", {
      userId,
      count,
      updatedAt: new Date().toISOString(),
      notificationIds: updatedNotifications.map((n) => n.id),
    });
  }
}

module.exports = NotificationMarkAllAsUnreadModule;