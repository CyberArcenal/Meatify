// src/stateServices/notificationLog/modules/status/LogUpdatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * LogUpdatedModule - Handles side effects when a notification log is updated.
 * Includes UI broadcast.
 */
class LogUpdatedModule {
  /**
   * Handle log update side effects
   * @param {number} logId - The log ID
   * @param {Object} log - The log entity
   * @param {Object} changes - The changes made
   * @param {string} user - User performing the action
   */
  async handle(logId, log, changes, user = "system") {
    logger.info(`[LogUpdated] Log #${logId} updated (fields: ${Object.keys(changes).join(", ")}) by ${user}`);

    // 1. Broadcast to UI
    this._broadcastUpdated(logId, changes, log.updated_at);
  }

  /**
   * Broadcast updated log to UI
   * @private
   */
  _broadcastUpdated(logId, changes, updatedAt) {
    UIBroadcaster.notificationLog("updated", {
      id: logId,
      changes: changes,
      updatedAt: updatedAt,
    });
  }
}

module.exports = LogUpdatedModule;