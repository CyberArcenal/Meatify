// src/stateServices/notification/modules/status/NotificationUpdatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * NotificationUpdatedModule - Handles side effects when a notification is updated.
 * Includes UI broadcast.
 */
class NotificationUpdatedModule {
  /**
   * Handle notification update side effects
   * @param {Object} notification - The updated notification entity
   * @param {Object} changes - The changes made
   * @param {string} user - User performing the action
   */
  async handle(notification, changes, user = "system") {
    logger.info(`[NotificationUpdated] Notification #${notification.id} updated (fields: ${Object.keys(changes).join(", ")}) by ${user}`);

    // 1. Broadcast to UI
    this._broadcastUpdated(notification, changes);
  }

  /**
   * Broadcast updated notification to UI
   * @private
   */
  _broadcastUpdated(notification, changes) {
    UIBroadcaster.notification("updated", {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      changes: changes,
      updatedAt: notification.updatedAt,
    });
  }
}

module.exports = NotificationUpdatedModule;