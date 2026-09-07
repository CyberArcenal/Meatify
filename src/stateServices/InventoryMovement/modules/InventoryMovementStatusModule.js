// src/stateServices/inventoryMovement/modules/InventoryMovementStatusModule.js
const { logger } = require("../../../utils/logger");

/**
 * InventoryMovementStatusModule - Handles status validation for inventory movements.
 * Currently acts as a placeholder for future status transition logic.
 * 
 * FUTURE USE CASES:
 * - Validate if a movement can be updated
 * - Validate if a movement can be deleted
 * - Check if movement type is valid for the current batch status
 * - Auto-correct movement type based on context
 */
class InventoryMovementStatusModule {
  /**
   * Validate if a movement can be created
   * @param {Object} movementData - The movement data
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateCreate(movementData, context = {}) {
    logger.debug(`[InventoryMovementStatus] Validating movement creation for type: ${movementData.movementType}`);

    // 1. qtyChange cannot be zero
    if (movementData.qtyChange === 0) {
      return { valid: false, reason: "Quantity change cannot be zero" };
    }

    // 2. Movement type must be valid
    const validTypes = ['sale', 'refund', 'adjustment', 'purchase', 'expiry_write_off', 'waste'];
    if (!validTypes.includes(movementData.movementType)) {
      return { valid: false, reason: `Invalid movement type: ${movementData.movementType}` };
    }

    return { valid: true };
  }

  /**
   * Validate if a movement can be updated
   * @param {Object} movement - The existing movement entity
   * @param {Object} updates - The updates to apply
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateUpdate(movement, updates, context = {}) {
    logger.debug(`[InventoryMovementStatus] Validating movement #${movement.id} update`);

    // Cannot change core fields after creation
    const forbiddenFields = ['meatId', 'batchId', 'saleId', 'qtyChange'];
    const attemptedForbidden = forbiddenFields.filter(f => updates[f] !== undefined);
    if (attemptedForbidden.length > 0) {
      return {
        valid: false,
        reason: `Cannot change immutable fields: ${attemptedForbidden.join(', ')}`
      };
    }

    // If updating movementType, ensure it's valid
    if (updates.movementType) {
      const validTypes = ['sale', 'refund', 'adjustment', 'purchase', 'expiry_write_off', 'waste'];
      if (!validTypes.includes(updates.movementType)) {
        return { valid: false, reason: `Invalid movement type: ${updates.movementType}` };
      }
    }

    return { valid: true };
  }

  /**
   * Validate if a movement can be deleted
   * @param {Object} movement - The existing movement entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateDelete(movement, context = {}) {
    logger.debug(`[InventoryMovementStatus] Validating movement #${movement.id} deletion`);
    // Currently no restrictions on deletion
    return { valid: true };
  }

  /**
   * Check if movement is in a valid state for its type
   * @param {Object} movement - The movement entity
   * @returns {boolean}
   */
  isValidState(movement) {
    const typeRules = {
      sale: (qty) => qty < 0,
      waste: (qty) => qty < 0,
      expiry_write_off: (qty) => qty < 0,
      purchase: (qty) => qty > 0,
      refund: (qty) => qty > 0,
      adjustment: () => true,
    };

    const rule = typeRules[movement.movementType];
    if (rule) return rule(movement.qtyChange);
    return true;
  }

  /**
   * Get allowed next statuses (placeholder for future)
   * @param {Object} movement - The movement entity
   * @param {string} action - The action being performed
   * @returns {string[]}
   */
  getAllowedNextStates(movement, action = 'update') {
    return [];
  }
}

module.exports = InventoryMovementStatusModule;