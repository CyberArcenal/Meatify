// src/stateServices/purchase/modules/status/PurchaseCompletedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * PurchaseCompletedModule - Handles side effects when a purchase is completed.
 * Includes UI broadcast.
 */
class PurchaseCompletedModule {
  /**
   * Handle purchase completion side effects
   * @param {Object} purchase - The purchase entity
   * @param {Object} options - Additional options
   * @param {number} options.batchCount - Number of batches created
   * @param {string} user - User performing the action
   */
  async handle(purchase, options = {}, user = "system") {
    const { batchCount = purchase.purchaseItems?.length || 0 } = options;

    logger.info(`[PurchaseCompleted] Purchase #${purchase.id} (${purchase.referenceNo}) completed by ${user}`);

    // 1. Broadcast to UI
    this._broadcastCompleted(purchase, batchCount);
  }

  /**
   * Broadcast purchase completed to UI
   * @private
   */
  _broadcastCompleted(purchase, batchCount) {
    UIBroadcaster.purchase("completed", {
      id: purchase.id,
      referenceNo: purchase.referenceNo,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplier?.name,
      totalAmount: purchase.totalAmount,
      batchCount: batchCount,
      completedAt: new Date().toISOString(),
    });
  }
}

module.exports = PurchaseCompletedModule;