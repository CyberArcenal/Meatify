// src/stateServices/batch/modules/BatchStatusModule.js
const { logger } = require("../../../utils/logger");
const UIBroadcaster = require("../../common/UIBroadcaster");

/**
 * BatchStatusModule - Handles UI broadcasts for batch status changes.
 * All methods are focused on broadcasting IPC events to renderer windows.
 */
class BatchStatusModule {
  /**
   * Broadcast batch created event
   * @param {Object} batch - The batch entity
   */
  broadcastCreated(batch) {
    logger.info(`[BatchStatus] Broadcasting batch #${batch.id} (${batch.batchCode}) created`);

    UIBroadcaster.batch("created", {
      id: batch.id,
      batchCode: batch.batchCode,
      meatId: batch.meatId,
      meatName: batch.meat?.name,
      initialQuantity: batch.initialQuantity,
      remainingQuantity: batch.remainingQuantity,
      expiryDate: batch.expiryDate,
      status: batch.status,
    });
  }

  /**
   * Broadcast batch depleted event
   * @param {Object} batch - The batch entity
   */
  broadcastDepleted(batch) {
    logger.info(`[BatchStatus] Broadcasting batch #${batch.id} (${batch.batchCode}) depleted`);

    UIBroadcaster.batch("depleted", {
      id: batch.id,
      batchCode: batch.batchCode,
      meatId: batch.meatId,
      meatName: batch.meat?.name,
      remainingQuantity: batch.remainingQuantity,
      expiredAt: new Date().toISOString(),
    });
  }

  /**
   * Broadcast batch expired event
   * @param {Object} batch - The batch entity
   */
  broadcastExpired(batch) {
    logger.info(`[BatchStatus] Broadcasting batch #${batch.id} (${batch.batchCode}) expired`);

    UIBroadcaster.batch("expired", {
      id: batch.id,
      batchCode: batch.batchCode,
      meatId: batch.meatId,
      meatName: batch.meat?.name,
      remainingQuantity: batch.remainingQuantity,
      expiryDate: batch.expiryDate,
    });
  }

  /**
   * Broadcast batch updated event
   * @param {number} batchId - The batch ID
   * @param {string} batchCode - The batch code
   * @param {Object} changes - The changes made
   * @param {Date} updatedAt - The update timestamp
   */
  broadcastUpdated(batchId, batchCode, changes, updatedAt) {
    logger.info(`[BatchStatus] Broadcasting batch #${batchId} (${batchCode}) updated`);

    UIBroadcaster.batch("updated", {
      id: batchId,
      batchCode: batchCode,
      changes: changes,
      updatedAt: updatedAt,
    });
  }

  /**
   * Broadcast batch deleted event
   * @param {number} batchId - The batch ID
   * @param {string} batchCode - The batch code
   */
  broadcastDeleted(batchId, batchCode) {
    logger.info(`[BatchStatus] Broadcasting batch #${batchId} (${batchCode}) deleted`);

    UIBroadcaster.batch("deleted", {
      id: batchId,
      batchCode: batchCode,
      deletedAt: new Date().toISOString(),
    });
  }

  /**
   * Broadcast batch restored event
   * @param {Object} batch - The batch entity
   */
  broadcastRestored(batch) {
    logger.info(`[BatchStatus] Broadcasting batch #${batch.id} (${batch.batchCode}) restored`);

    UIBroadcaster.batch("restored", {
      id: batch.id,
      batchCode: batch.batchCode,
      restoredAt: new Date().toISOString(),
    });
  }

  /**
   * Broadcast batch expiring soon event
   * @param {Object} batch - The batch entity
   * @param {number} daysUntilExpiry - Days until expiry
   */
  broadcastExpiringSoon(batch, daysUntilExpiry) {
    logger.info(`[BatchStatus] Broadcasting batch #${batch.id} (${batch.batchCode}) expiring in ${daysUntilExpiry} days`);

    UIBroadcaster.batch("expiringSoon", {
      id: batch.id,
      batchCode: batch.batchCode,
      meatName: batch.meat?.name,
      daysUntilExpiry: daysUntilExpiry,
      expiryDate: batch.expiryDate,
    });
  }
}

module.exports = BatchStatusModule;