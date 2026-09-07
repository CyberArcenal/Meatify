// src/stateServices/inventoryMovement/modules/status/MovementCreatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * MovementCreatedModule - Handles side effects when an inventory movement is created.
 * Includes UI broadcast and batch update (delegated to BatchModule).
 */
class MovementCreatedModule {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
  }

  /**
   * Handle movement creation side effects
   * @param {Object} movement - The movement entity
   * @param {Function} batchUpdateFn - Function to update batch
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async handle(movement, batchUpdateFn, user = "system", queryRunner = null) {
    logger.info(`[MovementCreated] Movement #${movement.id} (${movement.movementType}) created by ${user}`);

    // 1. Broadcast to UI
    this._broadcastCreated(movement);

    // 2. Update batch remaining quantity (if linked to a batch)
    if (movement.batchId && batchUpdateFn) {
      await batchUpdateFn(movement, user, queryRunner);
    }
  }

  /**
   * Broadcast movement created to UI
   * @private
   */
  _broadcastCreated(movement) {
    UIBroadcaster.inventoryMovement("created", {
      id: movement.id,
      movementType: movement.movementType,
      qtyChange: movement.qtyChange,
      meatId: movement.meatId,
      meatName: movement.meat?.name,
      batchId: movement.batchId,
      batchCode: movement.batch?.batchCode,
      saleId: movement.saleId,
      notes: movement.notes,
      timestamp: movement.timestamp,
    });
  }
}

module.exports = MovementCreatedModule;