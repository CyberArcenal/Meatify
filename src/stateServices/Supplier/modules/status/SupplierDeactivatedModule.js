// src/stateServices/supplier/modules/status/SupplierDeactivatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * SupplierDeactivatedModule - Handles side effects when a supplier is deactivated.
 * Includes UI broadcast.
 */
class SupplierDeactivatedModule {
  /**
   * Handle supplier deactivation side effects
   * @param {Object} supplier - The supplier entity
   * @param {Object} options - Additional options
   * @param {number} options.meatsReassigned - Number of meats reassigned
   * @param {number} options.reassignToSupplierId - Target supplier ID
   * @param {number} options.pendingPurchases - Number of pending purchases
   * @param {string} user - User performing the action
   */
  async handle(supplier, options = {}, user = "system") {
    const { meatsReassigned = 0, reassignToSupplierId = null, pendingPurchases = 0 } = options;

    logger.info(`[SupplierDeactivated] Supplier #${supplier.id} (${supplier.name}) deactivated by ${user}`);

    // 1. Broadcast to UI
    this._broadcastDeactivated(supplier, meatsReassigned, reassignToSupplierId, pendingPurchases);
  }

  /**
   * Broadcast supplier deactivated to UI
   * @private
   */
  _broadcastDeactivated(supplier, meatsReassigned, reassignToSupplierId, pendingPurchases) {
    UIBroadcaster.supplier("deactivated", {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      meatsReassigned,
      reassignToSupplierId,
      pendingPurchases,
      deactivatedAt: new Date().toISOString(),
    });
  }
}

module.exports = SupplierDeactivatedModule;