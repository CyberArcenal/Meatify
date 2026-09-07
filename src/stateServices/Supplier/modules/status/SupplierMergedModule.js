// src/stateServices/supplier/modules/status/SupplierMergedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * SupplierMergedModule - Handles side effects when suppliers are merged.
 * Includes UI broadcast.
 */
class SupplierMergedModule {
  /**
   * Handle supplier merge side effects
   * @param {Object} data - Merge data
   * @param {number} data.sourceSupplierId - Source supplier ID
   * @param {string} data.sourceSupplierName - Source supplier name
   * @param {number} data.targetSupplierId - Target supplier ID
   * @param {string} data.targetSupplierName - Target supplier name
   * @param {number} data.meatsReassigned - Number of meats reassigned
   * @param {number} data.purchasesReassigned - Number of purchases reassigned
   * @param {number} data.batchesReassigned - Number of batches reassigned
   * @param {string} user - User performing the action
   */
  async handle(data, user = "system") {
    const {
      sourceSupplierId,
      sourceSupplierName,
      targetSupplierId,
      targetSupplierName,
      meatsReassigned = 0,
      purchasesReassigned = 0,
      batchesReassigned = 0,
    } = data;

    logger.info(`[SupplierMerged] Suppliers merged: #${sourceSupplierId} → #${targetSupplierId} by ${user}`);

    // 1. Broadcast to UI
    this._broadcastMerged(
      sourceSupplierId,
      sourceSupplierName,
      targetSupplierId,
      targetSupplierName,
      meatsReassigned,
      purchasesReassigned,
      batchesReassigned
    );
  }

  /**
   * Broadcast supplier merged to UI
   * @private
   */
  _broadcastMerged(
    sourceSupplierId,
    sourceSupplierName,
    targetSupplierId,
    targetSupplierName,
    meatsReassigned,
    purchasesReassigned,
    batchesReassigned
  ) {
    UIBroadcaster.supplier("merged", {
      sourceSupplierId,
      sourceSupplierName,
      targetSupplierId,
      targetSupplierName,
      meatsReassigned,
      purchasesReassigned,
      batchesReassigned,
      mergedAt: new Date().toISOString(),
    });
  }
}

module.exports = SupplierMergedModule;