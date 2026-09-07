// src/stateServices/notification/modules/status/NotificationRestoredModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * NotificationRestoredModule - Handles side effects when a notification is restored.
 * Includes UI broadcast.
 */
class NotificationRestoredModule {
  /**
   * Handle notification restoration side effects
   * @param {Object} notification - The restored notification entity
   * @param {string} user - User performing the action
   */
  async handle(notification, user = "system") {
    logger.info(`[NotificationRestored] Notification #${notification.id} restored by ${user}`);

    // 1. Broadcast to UI
    this._broadcastRestored(notification);
  }

  /**
   * Broadcast restored notification to UI
   * @private
   */
  _broadcastRestored(notification) {
    UIBroadcaster.notification("restored", {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      restoredAt: new Date().toISOString(),
    });
  }
}

module.exports = NotificationRestoredModule;