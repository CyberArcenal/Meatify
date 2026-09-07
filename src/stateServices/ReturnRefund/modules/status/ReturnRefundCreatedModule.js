// src/stateServices/returnRefund/modules/status/ReturnRefundCreatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * ReturnRefundCreatedModule - Handles side effects when a return/refund is created.
 * Includes UI broadcast.
 */
class ReturnRefundCreatedModule {
  /**
   * Handle return creation side effects
   * @param {Object} returnRefund - The return entity
   * @param {string} user - User performing the action
   */
  async handle(returnRefund, user = "system") {
    logger.info(`[ReturnRefundCreated] Return #${returnRefund.id} (${returnRefund.referenceNo}) created by ${user}`);

    // 1. Broadcast to UI
    this._broadcastCreated(returnRefund);
  }

  /**
   * Broadcast return created to UI
   * @private
   */
  _broadcastCreated(returnRefund) {
    UIBroadcaster.returnRefund("created", {
      id: returnRefund.id,
      referenceNo: returnRefund.referenceNo,
      saleId: returnRefund.saleId,
      customerId: returnRefund.customerId,
      customerName: returnRefund.customer?.name,
      status: returnRefund.status,
      totalAmount: returnRefund.totalAmount,
      refundMethod: returnRefund.refundMethod,
      reason: returnRefund.reason,
      createdAt: returnRefund.createdAt,
    });
  }
}

module.exports = ReturnRefundCreatedModule;