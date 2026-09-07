// src/stateServices/meat/modules/status/MeatCreatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * MeatCreatedModule - Handles side effects when a meat product is created.
 * Includes UI broadcast.
 */
class MeatCreatedModule {
  /**
   * Handle meat creation side effects
   * @param {Object} meat - The meat entity
   * @param {string} user - User performing the action
   */
  async handle(meat, user = "system") {
    logger.info(`[MeatCreated] Meat #${meat.id} (${meat.name}) created by ${user}`);

    // 1. Broadcast to UI
    this._broadcastCreated(meat);
  }

  /**
   * Broadcast meat created to UI
   * @private
   */
  _broadcastCreated(meat) {
    UIBroadcaster.meat("created", {
      id: meat.id,
      name: meat.name,
      sku: meat.sku,
      barcode: meat.barcode,
      pricePerKg: meat.pricePerKg,
      isActive: meat.isActive,
      categoryId: meat.categoryId,
      supplierId: meat.supplierId,
      createdAt: meat.createdAt,
    });
  }
}

module.exports = MeatCreatedModule;