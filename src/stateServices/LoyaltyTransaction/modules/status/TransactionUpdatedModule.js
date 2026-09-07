// src/stateServices/loyaltyTransaction/modules/status/TransactionUpdatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * TransactionUpdatedModule - Handles side effects when a loyalty transaction is updated.
 * Includes UI broadcast.
 */
class TransactionUpdatedModule {
  /**
   * Handle transaction update side effects
   * @param {number} transactionId - The transaction ID
   * @param {Object} transaction - The transaction entity
   * @param {Object} changes - The changes made
   * @param {string} user - User performing the action
   */
  async handle(transactionId, transaction, changes, user = "system") {
    logger.info(`[TransactionUpdated] Transaction #${transactionId} updated (fields: ${Object.keys(changes).join(", ")})`);

    // 1. Broadcast to UI
    this._broadcastUpdated(transactionId, changes, transaction.updatedAt);
  }

  /**
   * Broadcast transaction updated to UI
   * @private
   */
  _broadcastUpdated(transactionId, changes, updatedAt) {
    UIBroadcaster.loyalty("transactionUpdated", {
      id: transactionId,
      changes: changes,
      updatedAt: updatedAt,
    });
  }
}

module.exports = TransactionUpdatedModule;