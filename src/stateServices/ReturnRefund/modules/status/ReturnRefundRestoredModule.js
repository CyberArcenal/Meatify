// src/stateServices/returnRefund/modules/status/ReturnRefundRestoredModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * ReturnRefundRestoredModule - Handles side effects when a return/refund is restored.
 * Includes UI broadcast.
 */
class ReturnRefundRestoredModule {
  /**
   * Handle return restoration side effects
   * @param {Object} returnRefund - The return entity
   * @param {string} user - User performing the action
   */
  async handle(returnRefund, user = "system") {
    logger.info(`[ReturnRefundRestored] Return #${returnRefund.id} (${returnRefund.referenceNo}) restored by ${user}`);

    // 1. Broadcast to UI
    this._broadcastRestored(returnRefund);
  }

  /**
   * Broadcast return restored to UI
   * @private
   */
  _broadcastRestored(returnRefund) {
    UIBroadcaster.returnRefund("restored", {
      id: returnRefund.id,
      referenceNo: returnRefund.referenceNo,
      restoredAt: new Date().toISOString(),
    });
  }
}

module.exports = ReturnRefundRestoredModule;