// src/stateServices/supplier/modules/status/SupplierActivatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * SupplierActivatedModule - Handles side effects when a supplier is activated.
 * Includes UI broadcast.
 */
class SupplierActivatedModule {
  /**
   * Handle supplier activation side effects
   * @param {Object} supplier - The supplier entity
   * @param {string} user - User performing the action
   */
  async handle(supplier, user = "system") {
    logger.info(`[SupplierActivated] Supplier #${supplier.id} (${supplier.name}) activated by ${user}`);

    // 1. Broadcast to UI
    this._broadcastActivated(supplier);
  }

  /**
   * Broadcast supplier activated to UI
   * @private
   */
  _broadcastActivated(supplier) {
    UIBroadcaster.supplier("activated", {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      activatedAt: new Date().toISOString(),
    });
  }
}

module.exports = SupplierActivatedModule;