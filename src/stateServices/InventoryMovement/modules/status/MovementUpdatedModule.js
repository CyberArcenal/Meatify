// src/stateServices/inventoryMovement/modules/status/MovementUpdatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * MovementUpdatedModule - Handles side effects when an inventory movement is updated.
 * Includes UI broadcast.
 */
class MovementUpdatedModule {
  /**
   * Handle movement update side effects
   * @param {number} movementId - The movement ID
   * @param {Object} movement - The movement entity
   * @param {Object} changes - The changes made
   * @param {string} user - User performing the action
   */
  async handle(movementId, movement, changes, user = "system") {
    logger.info(`[MovementUpdated] Movement #${movementId} updated (fields: ${Object.keys(changes).join(", ")}) by ${user}`);

    // 1. Broadcast to UI
    this._broadcastUpdated(movementId, changes, movement.updatedAt);
  }

  /**
   * Broadcast movement updated to UI
   * @private
   */
  _broadcastUpdated(movementId, changes, updatedAt) {
    UIBroadcaster.inventoryMovement("updated", {
      id: movementId,
      changes: changes,
      updatedAt: updatedAt,
    });
  }
}

module.exports = MovementUpdatedModule;