// src/stateServices/supplier/modules/status/SupplierDeletedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * SupplierDeletedModule - Handles side effects when a supplier is soft-deleted.
 * Includes UI broadcast.
 */
class SupplierDeletedModule {
  /**
   * Handle supplier deletion side effects
   * @param {number} supplierId - The supplier ID
   * @param {Object} supplier - The supplier entity (if available)
   * @param {string} user - User performing the action
   */
  async handle(supplierId, supplier, user = "system") {
    logger.info(`[SupplierDeleted] Supplier #${supplierId} (${supplier?.name}) soft-deleted by ${user}`);

    // 1. Broadcast to UI
    this._broadcastDeleted(supplierId, supplier);
  }

  /**
   * Broadcast supplier deleted to UI
   * @private
   */
  _broadcastDeleted(supplierId, supplier) {
    UIBroadcaster.supplier("deleted", {
      id: supplierId,
      name: supplier?.name,
      email: supplier?.email,
      phone: supplier?.phone,
      deletedAt: new Date().toISOString(),
    });
  }
}

module.exports = SupplierDeletedModule;