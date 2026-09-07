// src/stateServices/purchase/modules/PurchaseAuditModule.js
const AuditLogger = require("../../common/AuditLogger");

/**
 * PurchaseAuditModule - Handles audit logging for purchase events.
 * Delegates to the common AuditLogger.
 */
class PurchaseAuditModule {
  /**
   * Log purchase creation
   * @param {number} purchaseId - The purchase ID
   * @param {Object} purchase - The purchase entity
   * @param {string} user - User performing the action
   */
  async logCreated(purchaseId, purchase, user = "system") {
    await AuditLogger.logCreate("Purchase", purchaseId, purchase, user);
  }

  /**
   * Log purchase approval
   * @param {number} purchaseId - The purchase ID
   * @param {Object} purchase - The purchase entity
   * @param {string} user - User performing the action
   */
  async logApproved(purchaseId, purchase, user = "system") {
    await AuditLogger.logUpdate(
      "Purchase",
      purchaseId,
      { action: "approved" },
      { status: "approved" },
      user
    );
  }

  /**
   * Log purchase completion
   * @param {number} purchaseId - The purchase ID
   * @param {Object} purchase - The purchase entity
   * @param {string} user - User performing the action
   */
  async logCompleted(purchaseId, purchase, user = "system") {
    await AuditLogger.logUpdate(
      "Purchase",
      purchaseId,
      { action: "completed" },
      { status: "completed" },
      user
    );
  }

  /**
   * Log purchase cancellation
   * @param {number} purchaseId - The purchase ID
   * @param {Object} purchase - The purchase entity
   * @param {string} reason - Cancellation reason
   * @param {string} user - User performing the action
   */
  async logCancelled(purchaseId, purchase, reason = "", user = "system") {
    await AuditLogger.logUpdate(
      "Purchase",
      purchaseId,
      { action: "cancelled", reason },
      { status: "cancelled" },
      user
    );
  }

  /**
   * Log purchase update (generic)
   * @param {number} purchaseId - The purchase ID
   * @param {Object} changes - The changes made
   * @param {Object} purchase - The purchase entity
   * @param {string} user - User performing the action
   */
  async logUpdated(purchaseId, changes, purchase, user = "system") {
    await AuditLogger.logUpdate("Purchase", purchaseId, changes, purchase, user);
  }

  /**
   * Log purchase deletion
   * @param {number} purchaseId - The purchase ID
   * @param {Object} purchase - The purchase entity
   * @param {string} user - User performing the action
   */
  async logDeleted(purchaseId, purchase, user = "system") {
    await AuditLogger.logDelete("Purchase", purchaseId, purchase, user);
  }
}

module.exports = PurchaseAuditModule;