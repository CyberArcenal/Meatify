// src/stateServices/meat/modules/MeatStatusModule.js
const { logger } = require("../../../utils/logger");

/**
 * MeatStatusModule - Handles status validation for meat products.
 * Currently acts as a placeholder for future validation logic.
 *
 * FUTURE USE CASES:
 * - Validate if a meat can be deactivated (check for active batches)
 * - Validate if a meat can be deleted (check for active batches)
 * - Validate price changes (check for price limits)
 * - Validate SKU/name uniqueness
 */
class MeatStatusModule {
  /**
   * Validate if a meat can be activated
   * @param {Object} meat - The meat entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateActivate(meat, context = {}) {
    logger.debug(`[MeatStatus] Validating activation for meat #${meat.id}`);
    if (meat.isActive) {
      return { valid: false, reason: "Meat is already active" };
    }
    return { valid: true };
  }

  /**
   * Validate if a meat can be deactivated
   * @param {Object} meat - The meat entity
   * @param {Object} context - Additional context (activeBatchCount, etc.)
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateDeactivate(meat, context = {}) {
    logger.debug(`[MeatStatus] Validating deactivation for meat #${meat.id}`);

    if (!meat.isActive) {
      return { valid: false, reason: "Meat is already inactive" };
    }

    const { activeBatchCount = 0 } = context;
    if (activeBatchCount > 0) {
      return {
        valid: false,
        reason: `Cannot deactivate: ${activeBatchCount} active batch(es) exist`
      };
    }

    return { valid: true };
  }

  /**
   * Validate if a meat can be deleted
   * @param {Object} meat - The meat entity
   * @param {Object} context - Additional context (activeBatchCount, etc.)
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateDelete(meat, context = {}) {
    logger.debug(`[MeatStatus] Validating deletion for meat #${meat.id}`);

    const { activeBatchCount = 0 } = context;
    if (activeBatchCount > 0) {
      return {
        valid: false,
        reason: `Cannot delete: ${activeBatchCount} active batch(es) exist`
      };
    }

    return { valid: true };
  }

  /**
   * Validate price change
   * @param {Object} meat - The meat entity
   * @param {number} newPrice - New price
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validatePriceChange(meat, newPrice, context = {}) {
    logger.debug(`[MeatStatus] Validating price change for meat #${meat.id}`);

    if (newPrice < 0) {
      return { valid: false, reason: "Price cannot be negative" };
    }

    // Future: check max price limit from settings
    const maxPrice = context.maxPrice || 99999;
    if (newPrice > maxPrice) {
      return { valid: false, reason: `Price exceeds maximum allowed (₱${maxPrice})` };
    }

    return { valid: true };
  }

  /**
   * Get meat status summary
   * @param {Object} meat - The meat entity
   * @returns {{ isActive: boolean; hasBatches: boolean; status: string }}
   */
  getStatusSummary(meat) {
    return {
      isActive: meat.isActive,
      hasBatches: false, // This would be populated with batch count
      status: meat.isActive ? "active" : "inactive",
    };
  }
}

module.exports = MeatStatusModule;