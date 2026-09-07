// src/stateServices/meat/modules/status/MeatRestoredModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * MeatRestoredModule - Handles side effects when a meat product is restored.
 * Includes UI broadcast.
 */
class MeatRestoredModule {
  /**
   * Handle meat restoration side effects
   * @param {Object} meat - The meat entity
   * @param {string} user - User performing the action
   */
  async handle(meat, user = "system") {
    logger.info(`[MeatRestored] Meat #${meat.id} (${meat.name}) restored by ${user}`);

    // 1. Broadcast to UI
    this._broadcastRestored(meat);
  }

  /**
   * Broadcast meat restored to UI
   * @private
   */
  _broadcastRestored(meat) {
    UIBroadcaster.meat("restored", {
      id: meat.id,
      name: meat.name,
      sku: meat.sku,
      restoredAt: new Date().toISOString(),
    });
  }
}

module.exports = MeatRestoredModule;