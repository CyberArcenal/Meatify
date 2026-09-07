// src/stateServices/purchase/modules/status/PurchaseUpdatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * PurchaseUpdatedModule - Handles side effects when a purchase is updated.
 * Includes UI broadcast.
 */
class PurchaseUpdatedModule {
  /**
   * Handle purchase update side effects
   * @param {Object} purchase - The purchase entity
   * @param {Object} changes - The changes made
   * @param {string} user - User performing the action
   */
  async handle(purchase, changes, user = "system") {
    logger.info(`[PurchaseUpdated] Purchase #${purchase.id} (${purchase.referenceNo}) updated (fields: ${Object.keys(changes).join(", ")}) by ${user}`);

    // 1. Broadcast to UI
    this._broadcastUpdated(purchase, changes);
  }

  /**
   * Broadcast purchase updated to UI
   * @private
   */
  _broadcastUpdated(purchase, changes) {
    UIBroadcaster.purchase("updated", {
      id: purchase.id,
      referenceNo: purchase.referenceNo,
      changes: changes,
      updatedAt: purchase.updatedAt,
    });
  }
}

module.exports = PurchaseUpdatedModule;