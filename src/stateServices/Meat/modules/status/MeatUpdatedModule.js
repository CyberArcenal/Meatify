// src/stateServices/meat/modules/status/MeatUpdatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * MeatUpdatedModule - Handles side effects when a meat product is updated.
 * Includes UI broadcast.
 */
class MeatUpdatedModule {
  /**
   * Handle meat update side effects
   * @param {Object} meat - The meat entity
   * @param {Object} changes - The changes made
   * @param {string} user - User performing the action
   */
  async handle(meat, changes, user = "system") {
    logger.info(`[MeatUpdated] Meat #${meat.id} (${meat.name}) updated (fields: ${Object.keys(changes).join(", ")}) by ${user}`);

    // 1. Broadcast to UI
    this._broadcastUpdated(meat, changes);
  }

  /**
   * Broadcast meat updated to UI
   * @private
   */
  _broadcastUpdated(meat, changes) {
    UIBroadcaster.meat("updated", {
      id: meat.id,
      name: meat.name,
      sku: meat.sku,
      changes: changes,
      updatedAt: meat.updatedAt,
    });
  }
}

module.exports = MeatUpdatedModule;