// src/stateServices/returnRefund/modules/status/ReturnRefundUpdatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * ReturnRefundUpdatedModule - Handles side effects when a return/refund is updated.
 * Includes UI broadcast.
 */
class ReturnRefundUpdatedModule {
  /**
   * Handle return update side effects
   * @param {Object} returnRefund - The return entity
   * @param {Object} changes - The changes made
   * @param {string} user - User performing the action
   */
  async handle(returnRefund, changes, user = "system") {
    logger.info(`[ReturnRefundUpdated] Return #${returnRefund.id} (${returnRefund.referenceNo}) updated (fields: ${Object.keys(changes).join(", ")}) by ${user}`);

    // 1. Broadcast to UI
    this._broadcastUpdated(returnRefund, changes);
  }

  /**
   * Broadcast return updated to UI
   * @private
   */
  _broadcastUpdated(returnRefund, changes) {
    UIBroadcaster.returnRefund("updated", {
      id: returnRefund.id,
      referenceNo: returnRefund.referenceNo,
      changes: changes,
      updatedAt: returnRefund.updatedAt,
    });
  }
}

module.exports = ReturnRefundUpdatedModule;