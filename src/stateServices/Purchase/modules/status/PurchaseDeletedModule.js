// src/stateServices/purchase/modules/status/PurchaseDeletedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * PurchaseDeletedModule - Handles side effects when a purchase is soft-deleted.
 * Includes UI broadcast.
 */
class PurchaseDeletedModule {
  /**
   * Handle purchase deletion side effects
   * @param {number} purchaseId - The purchase ID
   * @param {Object} purchase - The purchase entity (if available)
   * @param {string} user - User performing the action
   */
  async handle(purchaseId, purchase, user = "system") {
    logger.info(`[PurchaseDeleted] Purchase #${purchaseId} (${purchase?.referenceNo}) soft-deleted by ${user}`);

    // 1. Broadcast to UI
    this._broadcastDeleted(purchaseId, purchase);
  }

  /**
   * Broadcast purchase deleted to UI
   * @private
   */
  _broadcastDeleted(purchaseId, purchase) {
    UIBroadcaster.purchase("deleted", {
      id: purchaseId,
      referenceNo: purchase?.referenceNo,
      deletedAt: new Date().toISOString(),
    });
  }
}

module.exports = PurchaseDeletedModule;