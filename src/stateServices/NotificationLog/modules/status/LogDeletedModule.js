// src/stateServices/notificationLog/modules/status/LogDeletedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * LogDeletedModule - Handles side effects when a notification log is soft-deleted.
 * Includes UI broadcast.
 */
class LogDeletedModule {
  /**
   * Handle log deletion side effects
   * @param {number} logId - The log ID
   * @param {Object} log - The log entity (if available)
   * @param {string} user - User performing the action
   */
  async handle(logId, log, user = "system") {
    logger.info(`[LogDeleted] Log #${logId} soft-deleted by ${user}`);

    // 1. Broadcast to UI
    this._broadcastDeleted(logId, log);
  }

  /**
   * Broadcast deleted log to UI
   * @private
   */
  _broadcastDeleted(logId, log) {
    UIBroadcaster.notificationLog("deleted", {
      id: logId,
      recipient: log?.recipient_email,
      subject: log?.subject,
      deletedAt: new Date().toISOString(),
    });
  }
}

module.exports = LogDeletedModule;