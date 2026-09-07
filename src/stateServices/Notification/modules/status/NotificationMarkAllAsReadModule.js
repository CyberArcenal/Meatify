// src/stateServices/notification/modules/status/NotificationMarkAllAsReadModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * NotificationMarkAllAsReadModule - Handles side effects when all notifications are marked as read.
 * Includes UI broadcast.
 */
class NotificationMarkAllAsReadModule {
  /**
   * Handle mark all as read side effects
   * @param {number} userId - The user ID
   * @param {Array} updatedNotifications - The updated notifications
   * @param {string} user - User performing the action
   */
  async handle(userId, updatedNotifications, user = "system") {
    const count = updatedNotifications.length;
    if (count === 0) return;

    logger.info(`[NotificationMarkAllAsRead] Marked ${count} notifications as read for user #${userId} by ${user}`);

    // 1. Broadcast to UI
    this._broadcastAllRead(userId, count, updatedNotifications);
  }

  /**
   * Broadcast all read to UI
   * @private
   */
  _broadcastAllRead(userId, count, updatedNotifications) {
    UIBroadcaster.notification("allRead", {
      userId,
      count,
      updatedAt: new Date().toISOString(),
      notificationIds: updatedNotifications.map((n) => n.id),
    });
  }
}

module.exports = NotificationMarkAllAsReadModule;