// src/stateServices/batch/modules/BatchAuditModule.js
const AuditLogger = require("../../common/AuditLogger");

/**
 * BatchAuditModule - Handles audit logging for batch events.
 * Delegates to the common AuditLogger.
 */
class BatchAuditModule {
  /**
   * Log batch creation
   * @param {number} batchId - The batch ID
   * @param {Object} batch - The batch entity
   * @param {string} user - User performing the action
   */
  async logCreated(batchId, batch, user = "system") {
    await AuditLogger.logCreate("Batch", batchId, batch, user);
  }

  /**
   * Log batch status change (depleted/expired/updated)
   * @param {number} batchId - The batch ID
   * @param {Object} oldData - The previous data
   * @param {Object} newData - The new data
   * @param {string} user - User performing the action
   */
  async logUpdated(batchId, oldData, newData, user = "system") {
    await AuditLogger.logUpdate("Batch", batchId, oldData, newData, user);
  }

  /**
   * Log batch deletion
   * @param {number} batchId - The batch ID
   * @param {Object} batch - The batch entity
   * @param {string} user - User performing the action
   */
  async logDeleted(batchId, batch, user = "system") {
    await AuditLogger.logDelete("Batch", batchId, batch, user);
  }

  /**
   * Log batch restore
   * @param {number} batchId - The batch ID
   * @param {Object} batch - The batch entity
   * @param {string} user - User performing the action
   */
  async logRestored(batchId, batch, user = "system") {
    await AuditLogger.logUpdate(
      "Batch",
      batchId,
      { action: "restored" },
      { status: "active" },
      user
    );
  }
}

module.exports = BatchAuditModule;