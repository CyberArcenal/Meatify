// src/stateServices/returnRefund/modules/status/ReturnRefundDeletedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * ReturnRefundDeletedModule - Handles side effects when a return/refund is soft-deleted.
 * Includes UI broadcast.
 */
class ReturnRefundDeletedModule {
  /**
   * Handle return deletion side effects
   * @param {number} returnId - The return ID
   * @param {Object} returnRefund - The return entity (if available)
   * @param {string} user - User performing the action
   */
  async handle(returnId, returnRefund, user = "system") {
    logger.info(`[ReturnRefundDeleted] Return #${returnId} (${returnRefund?.referenceNo}) soft-deleted by ${user}`);

    // 1. Broadcast to UI
    this._broadcastDeleted(returnId, returnRefund);
  }

  /**
   * Broadcast return deleted to UI
   * @private
   */
  _broadcastDeleted(returnId, returnRefund) {
    UIBroadcaster.returnRefund("deleted", {
      id: returnId,
      referenceNo: returnRefund?.referenceNo,
      deletedAt: new Date().toISOString(),
    });
  }
}

module.exports = ReturnRefundDeletedModule;