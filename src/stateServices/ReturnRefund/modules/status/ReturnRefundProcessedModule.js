// src/stateServices/returnRefund/modules/status/ReturnRefundProcessedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * ReturnRefundProcessedModule - Handles side effects when a return/refund is processed.
 * Includes UI broadcast.
 */
class ReturnRefundProcessedModule {
  /**
   * Handle return processed side effects
   * @param {Object} returnRefund - The return entity
   * @param {Object} options - Additional options
   * @param {number} options.itemsRestocked - Number of items restocked
   * @param {number} options.pointsReversed - Loyalty points reversed
   * @param {string} user - User performing the action
   */
  async handle(returnRefund, options = {}, user = "system") {
    const { itemsRestocked = 0, pointsReversed = 0 } = options;

    logger.info(`[ReturnRefundProcessed] Return #${returnRefund.id} (${returnRefund.referenceNo}) processed by ${user}`);

    // 1. Broadcast to UI
    this._broadcastProcessed(returnRefund, itemsRestocked, pointsReversed);
  }

  /**
   * Broadcast return processed to UI
   * @private
   */
  _broadcastProcessed(returnRefund, itemsRestocked, pointsReversed) {
    UIBroadcaster.returnRefund("processed", {
      id: returnRefund.id,
      referenceNo: returnRefund.referenceNo,
      customerId: returnRefund.customerId,
      customerName: returnRefund.customer?.name,
      totalAmount: returnRefund.totalAmount,
      refundMethod: returnRefund.refundMethod,
      itemsRestocked,
      pointsReversed,
      processedAt: new Date().toISOString(),
    });
  }
}

module.exports = ReturnRefundProcessedModule;