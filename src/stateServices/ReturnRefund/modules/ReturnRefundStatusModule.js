// src/stateServices/returnRefund/modules/ReturnRefundStatusModule.js
const { logger } = require("../../../utils/logger");

/**
 * ReturnRefundStatusModule - Handles status validation for return/refund events.
 *
 * FUTURE USE CASES:
 * - Validate if a return can be processed (e.g., pending status, items exist)
 * - Validate if a return can be cancelled (e.g., not already cancelled)
 * - Validate if a return can be restored (e.g., deleted status)
 */
class ReturnRefundStatusModule {
  /**
   * Validate if a return can be processed
   * @param {Object} returnRefund - The return entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateProcess(returnRefund, context = {}) {
    logger.debug(`[ReturnRefundStatus] Validating process for return #${returnRefund.id}`);

    if (returnRefund.status !== "pending") {
      return { valid: false, reason: `Cannot process a return with status "${returnRefund.status}"` };
    }

    if (!returnRefund.items || returnRefund.items.length === 0) {
      return { valid: false, reason: "Cannot process a return with no items" };
    }

    return { valid: true };
  }

  /**
   * Validate if a return can be cancelled
   * @param {Object} returnRefund - The return entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateCancel(returnRefund, context = {}) {
    logger.debug(`[ReturnRefundStatus] Validating cancellation for return #${returnRefund.id}`);

    if (returnRefund.status === "cancelled") {
      return { valid: false, reason: "Return is already cancelled" };
    }

    // Processed returns can be cancelled (but with reversal logic)
    // No restriction here – the service handles it.

    return { valid: true };
  }

  /**
   * Validate if a return can be restored
   * @param {Object} returnRefund - The return entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateRestore(returnRefund, context = {}) {
    logger.debug(`[ReturnRefundStatus] Validating restore for return #${returnRefund.id}`);

    if (!returnRefund.deletedAt) {
      return { valid: false, reason: "Return is not deleted" };
    }

    return { valid: true };
  }

  /**
   * Get allowed status transitions
   * @param {Object} returnRefund - The return entity
   * @returns {string[]} Array of allowed next statuses
   */
  getAllowedTransitions(returnRefund) {
    const transitions = {
      pending: ["processed", "cancelled"],
      processed: ["cancelled"],
      cancelled: [],
    };

    return transitions[returnRefund.status] || [];
  }

  /**
   * Get return status summary
   * @param {Object} returnRefund - The return entity
   * @returns {{ status: string; isActive: boolean; canProcess: boolean; canCancel: boolean; canRestore: boolean }}
   */
  getStatusSummary(returnRefund) {
    const allowedTransitions = this.getAllowedTransitions(returnRefund);

    return {
      status: returnRefund.status,
      isActive: returnRefund.status === "pending" || returnRefund.status === "processed",
      canProcess: allowedTransitions.includes("processed"),
      canCancel: allowedTransitions.includes("cancelled"),
      canRestore: returnRefund.deletedAt !== null,
    };
  }

  /**
   * Get valid return statuses
   * @returns {string[]}
   */
  getValidStatuses() {
    return ["pending", "processed", "cancelled"];
  }
}

module.exports = ReturnRefundStatusModule;