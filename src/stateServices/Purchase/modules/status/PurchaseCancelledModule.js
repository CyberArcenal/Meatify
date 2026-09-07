// src/stateServices/purchase/modules/status/PurchaseCancelledModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * PurchaseCancelledModule - Handles side effects when a purchase is cancelled.
 * Includes UI broadcast.
 */
class PurchaseCancelledModule {
  /**
   * Handle purchase cancellation side effects
   * @param {Object} purchase - The purchase entity
   * @param {string} reason - Cancellation reason
   * @param {string} user - User performing the action
   */
  async handle(purchase, reason = "", user = "system") {
    logger.info(`[PurchaseCancelled] Purchase #${purchase.id} (${purchase.referenceNo}) cancelled by ${user}`);

    // 1. Broadcast to UI
    this._broadcastCancelled(purchase, reason);
  }

  /**
   * Broadcast purchase cancelled to UI
   * @private
   */
  _broadcastCancelled(purchase, reason) {
    UIBroadcaster.purchase("cancelled", {
      id: purchase.id,
      referenceNo: purchase.referenceNo,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplier?.name,
      reason: reason,
      cancelledAt: new Date().toISOString(),
    });
  }
}

module.exports = PurchaseCancelledModule;