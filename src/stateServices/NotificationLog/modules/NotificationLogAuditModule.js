// src/stateServices/notificationLog/modules/NotificationLogAuditModule.js
const AuditLogger = require("../../common/AuditLogger");

/**
 * NotificationLogAuditModule - Handles audit logging for notification log events.
 * Delegates to the common AuditLogger.
 */
class NotificationLogAuditModule {
  /**
   * Log log creation (status change after send)
   * @param {number} logId - The log ID
   * @param {Object} oldData - Old data (status)
   * @param {Object} newData - New data (status)
   * @param {string} user - User performing the action
   */
  async logStatusChange(logId, oldData, newData, user = "system") {
    await AuditLogger.logUpdate(
      "NotificationLog",
      logId,
      { status: oldData.status || "queued" },
      { status: newData.status },
      user
    );
  }

  /**
   * Log log update (generic)
   * @param {number} logId - The log ID
   * @param {Object} changes - The changes made
   * @param {Object} log - The updated log entity
   * @param {string} user - User performing the action
   */
  async logUpdated(logId, changes, log, user = "system") {
    await AuditLogger.logUpdate("NotificationLog", logId, changes, log, user);
  }

  /**
   * Log log deletion
   * @param {number} logId - The log ID
   * @param {Object} log - The log entity
   * @param {string} user - User performing the action
   */
  async logDeleted(logId, log, user = "system") {
    await AuditLogger.logDelete("NotificationLog", logId, log, user);
  }
}

module.exports = NotificationLogAuditModule;