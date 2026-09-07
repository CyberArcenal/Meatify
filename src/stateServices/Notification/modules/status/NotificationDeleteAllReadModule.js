// src/stateServices/notification/modules/status/NotificationDeleteAllReadModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * NotificationDeleteAllReadModule - Handles side effects when all read notifications are deleted.
 * Includes UI broadcast.
 */
class NotificationDeleteAllReadModule {
  /**
   * Handle delete all read side effects
   * @param {number} userId - The user ID
   * @param {number[]} deletedIds - The deleted notification IDs
   * @param {string} user - User performing the action
   */
  async handle(userId, deletedIds, user = "system") {
    const count = deletedIds.length;
    if (count === 0) return;

    logger.info(`[NotificationDeleteAllRead] Deleted ${count} read notifications for user #${userId} by ${user}`);

    // 1. Broadcast to UI
    this._broadcastAllReadDeleted(userId, count, deletedIds);
  }

  /**
   * Broadcast all read deleted to UI
   * @private
   */
  _broadcastAllReadDeleted(userId, count, deletedIds) {
    UIBroadcaster.notification("allReadDeleted", {
      userId,
      count,
      deletedIds,
      deletedAt: new Date().toISOString(),
    });
  }
}

module.exports = NotificationDeleteAllReadModule;