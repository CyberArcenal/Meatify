// src/stateServices/meat/modules/status/MeatDeletedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * MeatDeletedModule - Handles side effects when a meat product is soft-deleted.
 * Includes UI broadcast.
 */
class MeatDeletedModule {
  /**
   * Handle meat deletion side effects
   * @param {number} meatId - The meat ID
   * @param {Object} meat - The meat entity (if available)
   * @param {string} user - User performing the action
   */
  async handle(meatId, meat, user = "system") {
    logger.info(`[MeatDeleted] Meat #${meatId} (${meat?.name}) soft-deleted by ${user}`);

    // 1. Broadcast to UI
    this._broadcastDeleted(meatId, meat);
  }

  /**
   * Broadcast meat deleted to UI
   * @private
   */
  _broadcastDeleted(meatId, meat) {
    UIBroadcaster.meat("deleted", {
      id: meatId,
      name: meat?.name,
      sku: meat?.sku,
      deletedAt: new Date().toISOString(),
    });
  }
}

module.exports = MeatDeletedModule;