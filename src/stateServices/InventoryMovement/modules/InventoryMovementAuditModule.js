// src/stateServices/inventoryMovement/modules/InventoryMovementAuditModule.js
const AuditLogger = require("../../common/AuditLogger");

/**
 * InventoryMovementAuditModule - Handles audit logging for inventory movement events.
 */
class InventoryMovementAuditModule {
  /**
   * Log movement creation
   * @param {number} movementId - The movement ID
   * @param {Object} movement - The movement entity
   * @param {string} user - User performing the action
   */
  async logCreated(movementId, movement, user = "system") {
    await AuditLogger.logCreate("InventoryMovement", movementId, movement, user);
  }

  /**
   * Log movement update
   * @param {number} movementId - The movement ID
   * @param {Object} changes - The changes made
   * @param {Object} movement - The updated movement entity
   * @param {string} user - User performing the action
   */
  async logUpdated(movementId, changes, movement, user = "system") {
    await AuditLogger.logUpdate("InventoryMovement", movementId, changes, movement, user);
  }

  /**
   * Log movement deletion
   * @param {number} movementId - The movement ID
   * @param {Object} movement - The movement entity (if available)
   * @param {string} user - User performing the action
   */
  async logDeleted(movementId, movement, user = "system") {
    await AuditLogger.logDelete("InventoryMovement", movementId, movement, user);
  }

  /**
   * Log batch update (triggered by movement)
   * @param {number} batchId - The batch ID
   * @param {Object} oldData - Old batch data
   * @param {Object} newData - New batch data
   * @param {string} user - User performing the action
   */
  async logBatchUpdated(batchId, oldData, newData, user = "system") {
    await AuditLogger.logUpdate("Batch", batchId, oldData, newData, user);
  }
}

module.exports = InventoryMovementAuditModule;