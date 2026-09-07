// src/stateServices/purchase/modules/status/PurchaseCreatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * PurchaseCreatedModule - Handles side effects when a purchase is created.
 * Includes UI broadcast.
 */
class PurchaseCreatedModule {
  /**
   * Handle purchase creation side effects
   * @param {Object} purchase - The purchase entity
   * @param {string} user - User performing the action
   */
  async handle(purchase, user = "system") {
    logger.info(`[PurchaseCreated] Purchase #${purchase.id} (${purchase.referenceNo}) created by ${user}`);

    // 1. Broadcast to UI
    this._broadcastCreated(purchase);
  }

  /**
   * Broadcast purchase created to UI
   * @private
   */
  _broadcastCreated(purchase) {
    UIBroadcaster.purchase("created", {
      id: purchase.id,
      referenceNo: purchase.referenceNo,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplier?.name,
      status: purchase.status,
      totalAmount: purchase.totalAmount,
      orderDate: purchase.orderDate,
      createdAt: purchase.createdAt,
    });
  }
}

module.exports = PurchaseCreatedModule;