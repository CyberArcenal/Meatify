// src/stateServices/purchase/modules/status/PurchaseApprovedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * PurchaseApprovedModule - Handles side effects when a purchase is approved.
 * Includes UI broadcast.
 */
class PurchaseApprovedModule {
  /**
   * Handle purchase approval side effects
   * @param {Object} purchase - The purchase entity
   * @param {string} user - User performing the action
   */
  async handle(purchase, user = "system") {
    logger.info(`[PurchaseApproved] Purchase #${purchase.id} (${purchase.referenceNo}) approved by ${user}`);

    // 1. Broadcast to UI
    this._broadcastApproved(purchase);
  }

  /**
   * Broadcast purchase approved to UI
   * @private
   */
  _broadcastApproved(purchase) {
    UIBroadcaster.purchase("approved", {
      id: purchase.id,
      referenceNo: purchase.referenceNo,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplier?.name,
      totalAmount: purchase.totalAmount,
      approvedAt: new Date().toISOString(),
    });
  }
}

module.exports = PurchaseApprovedModule;