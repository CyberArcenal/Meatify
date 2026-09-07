// src/stateServices/notification/modules/status/NotificationCreatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");
const { Notification: ElectronNotification } = require("electron");

/**
 * NotificationCreatedModule - Handles side effects when a notification is created.
 * Includes UI broadcast, native OS notification, and audit logging.
 */
class NotificationCreatedModule {
  /**
   * Handle notification creation side effects
   * @param {Object} notification - The notification entity
   * @param {string} user - User performing the action
   */
  async handle(notification, user = "system") {
    logger.info(`[NotificationCreated] Notification #${notification.id} created by ${user}`);

    // 1. Broadcast to UI for toast popup
    this._broadcastCreated(notification);

    // 2. Show native OS notification (system toast)
    this._showNativeNotification(notification);

    // 3. Audit log (handled separately by orchestrator)
  }

  /**
   * Broadcast notification created to UI
   * @private
   */
  _broadcastCreated(notification) {
    UIBroadcaster.notification("created", {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
    });
  }

  /**
   * Show native OS notification (system toast)
   * @private
   */
  _showNativeNotification(notification) {
    try {
      if (!ElectronNotification || !ElectronNotification.isSupported()) {
        logger.debug("[NotificationCreated] Native notifications not supported.");
        return;
      }

      const notif = new ElectronNotification({
        title: notification.title,
        body: notification.message,
        silent: notification.type === "info",
        icon: null,
      });
      notif.show();
    } catch (err) {
      logger.debug("[NotificationCreated] Failed to show native notification:", err.message);
    }
  }
}

module.exports = NotificationCreatedModule;