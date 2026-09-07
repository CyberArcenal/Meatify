// src/stateServices/supplier/modules/SupplierStatusModule.js
const { logger } = require("../../../utils/logger");

/**
 * SupplierStatusModule - Handles status validation for supplier events.
 *
 * FUTURE USE CASES:
 * - Validate if a supplier can be activated (e.g., name not empty)
 * - Validate if a supplier can be deactivated (e.g., no pending purchases)
 * - Validate if a supplier can be merged (e.g., not same supplier)
 * - Validate if a supplier can be deleted (e.g., no active relations)
 */
class SupplierStatusModule {
  /**
   * Validate if a supplier can be activated
   * @param {Object} supplier - The supplier entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateActivate(supplier, context = {}) {
    logger.debug(`[SupplierStatus] Validating activation for supplier #${supplier.id}`);

    if (supplier.isActive) {
      return { valid: false, reason: "Supplier is already active" };
    }

    if (!supplier.name || supplier.name.trim() === "") {
      return { valid: false, reason: "Supplier name is required" };
    }

    return { valid: true };
  }

  /**
   * Validate if a supplier can be deactivated
   * @param {Object} supplier - The supplier entity
   * @param {Object} context - Additional context (pendingPurchases, etc.)
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateDeactivate(supplier, context = {}) {
    logger.debug(`[SupplierStatus] Validating deactivation for supplier #${supplier.id}`);

    if (!supplier.isActive) {
      return { valid: false, reason: "Supplier is already inactive" };
    }

    const { pendingPurchases = 0 } = context;
    if (pendingPurchases > 0) {
      return {
        valid: false,
        reason: `Cannot deactivate: ${pendingPurchases} pending purchase(s) exist`,
      };
    }

    // Additional checks: active meats? handled by service/reassignment

    return { valid: true };
  }

  /**
   * Validate if suppliers can be merged
   * @param {Object} sourceSupplier - Source supplier entity
   * @param {Object} targetSupplier - Target supplier entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateMerge(sourceSupplier, targetSupplier, context = {}) {
    logger.debug(`[SupplierStatus] Validating merge: #${sourceSupplier.id} → #${targetSupplier.id}`);

    if (sourceSupplier.id === targetSupplier.id) {
      return { valid: false, reason: "Cannot merge a supplier into itself" };
    }

    if (!targetSupplier.isActive) {
      return { valid: false, reason: "Target supplier must be active" };
    }

    return { valid: true };
  }

  /**
   * Get supplier status summary
   * @param {Object} supplier - The supplier entity
   * @returns {{ isActive: boolean; status: string; canActivate: boolean; canDeactivate: boolean; canMerge: boolean }}
   */
  getStatusSummary(supplier) {
    return {
      isActive: supplier.isActive,
      status: supplier.isActive ? "active" : "inactive",
      canActivate: !supplier.isActive,
      canDeactivate: supplier.isActive,
      canMerge: supplier.isActive,
    };
  }
}

module.exports = SupplierStatusModule;