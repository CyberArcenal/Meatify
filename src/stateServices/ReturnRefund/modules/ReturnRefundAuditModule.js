// src/stateServices/returnRefund/modules/ReturnRefundAuditModule.js
const AuditLogger = require("../../common/AuditLogger");

/**
 * ReturnRefundAuditModule - Handles audit logging for return/refund events.
 * Delegates to the common AuditLogger.
 */
class ReturnRefundAuditModule {
  /**
   * Log return creation
   * @param {number} returnId - The return ID
   * @param {Object} returnRefund - The return entity
   * @param {string} user - User performing the action
   */
  async logCreated(returnId, returnRefund, user = "system") {
    await AuditLogger.logCreate("ReturnRefund", returnId, returnRefund, user);
  }

  /**
   * Log return processed
   * @param {number} returnId - The return ID
   * @param {Object} returnRefund - The return entity
   * @param {Object} options - Additional options
   * @param {number} options.itemsRestocked - Number of items restocked
   * @param {number} options.pointsReversed - Loyalty points reversed
   * @param {string} user - User performing the action
   */
  async logProcessed(returnId, returnRefund, options = {}, user = "system") {
    const { itemsRestocked = 0, pointsReversed = 0 } = options;

    await AuditLogger.logUpdate(
      "ReturnRefund",
      returnId,
      { action: "processed", itemsRestocked, pointsReversed },
      { status: "processed" },
      user
    );
  }

  /**
   * Log return cancelled
   * @param {number} returnId - The return ID
   * @param {Object} returnRefund - The return entity
   * @param {string} reason - Cancellation reason
   * @param {Object} options - Additional options
   * @param {boolean} options.wasProcessed - Whether it was processed before cancellation
   * @param {string} user - User performing the action
   */
  async logCancelled(returnId, returnRefund, reason = "", options = {}, user = "system") {
    const { wasProcessed = false } = options;

    await AuditLogger.logUpdate(
      "ReturnRefund",
      returnId,
      { action: "cancelled", reason, wasProcessed },
      { status: "cancelled" },
      user
    );
  }

  /**
   * Log return update (generic)
   * @param {number} returnId - The return ID
   * @param {Object} changes - The changes made
   * @param {Object} returnRefund - The return entity
   * @param {string} user - User performing the action
   */
  async logUpdated(returnId, changes, returnRefund, user = "system") {
    await AuditLogger.logUpdate("ReturnRefund", returnId, changes, returnRefund, user);
  }

  /**
   * Log return deletion
   * @param {number} returnId - The return ID
   * @param {Object} returnRefund - The return entity
   * @param {string} user - User performing the action
   */
  async logDeleted(returnId, returnRefund, user = "system") {
    await AuditLogger.logDelete("ReturnRefund", returnId, returnRefund, user);
  }

  /**
   * Log return restore
   * @param {number} returnId - The return ID
   * @param {Object} returnRefund - The return entity
   * @param {string} user - User performing the action
   */
  async logRestored(returnId, returnRefund, user = "system") {
    await AuditLogger.logUpdate(
      "ReturnRefund",
      returnId,
      { action: "restored" },
      { status: returnRefund.status },
      user
    );
  }
}

module.exports = ReturnRefundAuditModule;