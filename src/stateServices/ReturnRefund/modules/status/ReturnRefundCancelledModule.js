// src/stateServices/returnRefund/modules/status/ReturnRefundCancelledModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * ReturnRefundCancelledModule - Handles side effects when a return/refund is cancelled.
 * Includes UI broadcast.
 */
class ReturnRefundCancelledModule {
  /**
   * Handle return cancelled side effects
   * @param {Object} returnRefund - The return entity
   * @param {string} reason - Cancellation reason
   * @param {Object} options - Additional options
   * @param {boolean} options.wasProcessed - Whether it was processed before cancellation
   * @param {number} options.itemsRestockedReversed - Number of items whose restock was reversed
   * @param {number} options.pointsRestored - Loyalty points restored
   * @param {string} user - User performing the action
   */
  async handle(returnRefund, reason = "", options = {}, user = "system") {
    const { wasProcessed = false, itemsRestockedReversed = 0, pointsRestored = 0 } = options;

    logger.info(`[ReturnRefundCancelled] Return #${returnRefund.id} (${returnRefund.referenceNo}) cancelled by ${user} (wasProcessed: ${wasProcessed})`);

    // 1. Broadcast to UI
    this._broadcastCancelled(returnRefund, reason, wasProcessed, itemsRestockedReversed, pointsRestored);
  }

  /**
   * Broadcast return cancelled to UI
   * @private
   */
  _broadcastCancelled(returnRefund, reason, wasProcessed, itemsRestockedReversed, pointsRestored) {
    UIBroadcaster.returnRefund("cancelled", {
      id: returnRefund.id,
      referenceNo: returnRefund.referenceNo,
      customerId: returnRefund.customerId,
      customerName: returnRefund.customer?.name,
      reason: reason,
      wasProcessed,
      itemsRestockedReversed,
      pointsRestored,
      cancelledAt: new Date().toISOString(),
    });
  }
}

module.exports = ReturnRefundCancelledModule;