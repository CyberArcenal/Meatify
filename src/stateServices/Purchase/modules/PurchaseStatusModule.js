// src/stateServices/purchase/modules/PurchaseStatusModule.js
const { logger } = require("../../../utils/logger");

/**
 * PurchaseStatusModule - Handles status validation for purchase events.
 *
 * FUTURE USE CASES:
 * - Validate if a purchase can be approved (e.g., has items, supplier active)
 * - Validate if a purchase can be completed (e.g., approved status)
 * - Validate if a purchase can be cancelled (e.g., not already completed)
 * - Check if status transition is allowed
 */
class PurchaseStatusModule {
  /**
   * Validate if a purchase can be approved
   * @param {Object} purchase - The purchase entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateApprove(purchase, context = {}) {
    logger.debug(`[PurchaseStatus] Validating approval for purchase #${purchase.id}`);

    if (purchase.status !== "pending") {
      return { valid: false, reason: `Cannot approve a purchase with status "${purchase.status}"` };
    }

    if (!purchase.purchaseItems || purchase.purchaseItems.length === 0) {
      return { valid: false, reason: "Cannot approve a purchase with no items" };
    }

    return { valid: true };
  }

  /**
   * Validate if a purchase can be completed
   * @param {Object} purchase - The purchase entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateComplete(purchase, context = {}) {
    logger.debug(`[PurchaseStatus] Validating completion for purchase #${purchase.id}`);

    const allowedStatuses = ["approved", "confirmed"];
    if (!allowedStatuses.includes(purchase.status)) {
      return { valid: false, reason: `Cannot complete a purchase with status "${purchase.status}"` };
    }

    if (!purchase.purchaseItems || purchase.purchaseItems.length === 0) {
      return { valid: false, reason: "Cannot complete a purchase with no items" };
    }

    return { valid: true };
  }

  /**
   * Validate if a purchase can be cancelled
   * @param {Object} purchase - The purchase entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateCancel(purchase, context = {}) {
    logger.debug(`[PurchaseStatus] Validating cancellation for purchase #${purchase.id}`);

    if (purchase.status === "completed") {
      return { valid: false, reason: "Cannot cancel a completed purchase" };
    }

    if (purchase.status === "cancelled") {
      return { valid: false, reason: "Purchase is already cancelled" };
    }

    return { valid: true };
  }

  /**
   * Get allowed status transitions
   * @param {Object} purchase - The purchase entity
   * @returns {string[]} Array of allowed next statuses
   */
  getAllowedTransitions(purchase) {
    const transitions = {
      pending: ["approved", "cancelled"],
      approved: ["completed", "cancelled"],
      confirmed: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };

    return transitions[purchase.status] || [];
  }

  /**
   * Get purchase status summary
   * @param {Object} purchase - The purchase entity
   * @returns {{ status: string; isActive: boolean; canApprove: boolean; canComplete: boolean; canCancel: boolean }}
   */
  getStatusSummary(purchase) {
    const allowedTransitions = this.getAllowedTransitions(purchase);

    return {
      status: purchase.status,
      isActive: !["completed", "cancelled"].includes(purchase.status),
      canApprove: allowedTransitions.includes("approved"),
      canComplete: allowedTransitions.includes("completed"),
      canCancel: allowedTransitions.includes("cancelled"),
    };
  }

  /**
   * Get valid purchase statuses
   * @returns {string[]}
   */
  getValidStatuses() {
    return ["pending", "approved", "confirmed", "completed", "cancelled"];
  }
}

module.exports = PurchaseStatusModule;