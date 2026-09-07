// src/stateServices/sale/modules/SaleStatusModule.js
const { logger } = require("../../../utils/logger");

/**
 * SaleStatusModule - Handles status validation for sale events.
 *
 * FUTURE USE CASES:
 * - Validate if a sale can be marked as paid (has items, customer active)
 * - Validate if a sale can be refunded (paid status)
 * - Validate if a sale can be voided (initiated status)
 * - Check if status transition is allowed
 */
class SaleStatusModule {
  /**
   * Validate if a sale can be marked as paid
   * @param {Object} sale - The sale entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validatePaid(sale, context = {}) {
    logger.debug(`[SaleStatus] Validating paid for sale #${sale.id}`);

    if (sale.status !== "initiated") {
      return { valid: false, reason: `Cannot mark a sale with status "${sale.status}" as paid` };
    }

    if (!sale.saleItems || sale.saleItems.length === 0) {
      return { valid: false, reason: "Cannot mark a sale with no items as paid" };
    }

    return { valid: true };
  }

  /**
   * Validate if a sale can be refunded
   * @param {Object} sale - The sale entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateRefunded(sale, context = {}) {
    logger.debug(`[SaleStatus] Validating refund for sale #${sale.id}`);

    if (sale.status !== "paid") {
      return { valid: false, reason: `Cannot refund a sale with status "${sale.status}"` };
    }

    return { valid: true };
  }

  /**
   * Validate if a sale can be voided
   * @param {Object} sale - The sale entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateVoided(sale, context = {}) {
    logger.debug(`[SaleStatus] Validating void for sale #${sale.id}`);

    if (sale.status !== "initiated") {
      return { valid: false, reason: `Cannot void a sale with status "${sale.status}"` };
    }

    return { valid: true };
  }

  /**
   * Get allowed status transitions
   * @param {Object} sale - The sale entity
   * @returns {string[]} Array of allowed next statuses
   */
  getAllowedTransitions(sale) {
    const transitions = {
      initiated: ["paid", "voided"],
      paid: ["refunded"],
      refunded: [],
      voided: [],
    };

    return transitions[sale.status] || [];
  }

  /**
   * Get sale status summary
   * @param {Object} sale - The sale entity
   * @returns {{ status: string; isActive: boolean; canPaid: boolean; canRefunded: boolean; canVoided: boolean }}
   */
  getStatusSummary(sale) {
    const allowedTransitions = this.getAllowedTransitions(sale);

    return {
      status: sale.status,
      isActive: sale.status === "initiated" || sale.status === "paid",
      canPaid: allowedTransitions.includes("paid"),
      canRefunded: allowedTransitions.includes("refunded"),
      canVoided: allowedTransitions.includes("voided"),
    };
  }

  /**
   * Get valid sale statuses
   * @returns {string[]}
   */
  getValidStatuses() {
    return ["initiated", "paid", "refunded", "voided"];
  }
}

module.exports = SaleStatusModule;