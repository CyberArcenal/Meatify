// src/stateServices/loyaltyTransaction/modules/status/TransactionDeletedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * TransactionDeletedModule - Handles side effects when a loyalty transaction is soft-deleted.
 * Includes UI broadcast.
 */
class TransactionDeletedModule {
  /**
   * Handle transaction deletion side effects
   * @param {number} transactionId - The transaction ID
   * @param {Object} transaction - The transaction entity (if available)
   * @param {string} user - User performing the action
   */
  async handle(transactionId, transaction, user = "system") {
    logger.info(`[TransactionDeleted] Transaction #${transactionId} soft-deleted by ${user}`);

    // 1. Broadcast to UI
    this._broadcastDeleted(transactionId, transaction?.customerId);
  }

  /**
   * Broadcast transaction deleted to UI
   * @private
   */
  _broadcastDeleted(transactionId, customerId) {
    UIBroadcaster.loyalty("transactionDeleted", {
      id: transactionId,
      customerId: customerId,
      deletedAt: new Date().toISOString(),
    });
  }
}

module.exports = TransactionDeletedModule;