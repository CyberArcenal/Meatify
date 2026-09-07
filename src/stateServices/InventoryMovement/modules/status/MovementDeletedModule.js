// src/stateServices/inventoryMovement/modules/status/MovementDeletedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * MovementDeletedModule - Handles side effects when an inventory movement is deleted.
 * Includes UI broadcast.
 */
class MovementDeletedModule {
  /**
   * Handle movement deletion side effects
   * @param {number} movementId - The movement ID
   * @param {Object} movementData - The movement data (if available)
   * @param {string} user - User performing the action
   */
  async handle(movementId, movementData, user = "system") {
    logger.info(`[MovementDeleted] Movement #${movementId} deleted by ${user}`);

    // 1. Broadcast to UI
    this._broadcastDeleted(movementId);
  }

  /**
   * Broadcast movement deleted to UI
   * @private
   */
  _broadcastDeleted(movementId) {
    UIBroadcaster.inventoryMovement("deleted", {
      id: movementId,
      deletedAt: new Date().toISOString(),
    });
  }
}

module.exports = MovementDeletedModule;