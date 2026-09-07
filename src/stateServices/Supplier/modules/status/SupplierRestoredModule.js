// src/stateServices/supplier/modules/status/SupplierRestoredModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * SupplierRestoredModule - Handles side effects when a supplier is restored.
 * Includes UI broadcast.
 */
class SupplierRestoredModule {
  /**
   * Handle supplier restoration side effects
   * @param {Object} supplier - The supplier entity
   * @param {string} user - User performing the action
   */
  async handle(supplier, user = "system") {
    logger.info(`[SupplierRestored] Supplier #${supplier.id} (${supplier.name}) restored by ${user}`);

    // 1. Broadcast to UI
    this._broadcastRestored(supplier);
  }

  /**
   * Broadcast supplier restored to UI
   * @private
   */
  _broadcastRestored(supplier) {
    UIBroadcaster.supplier("restored", {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      restoredAt: new Date().toISOString(),
    });
  }
}

module.exports = SupplierRestoredModule;