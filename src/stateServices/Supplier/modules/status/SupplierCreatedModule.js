// src/stateServices/supplier/modules/status/SupplierCreatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * SupplierCreatedModule - Handles side effects when a supplier is created.
 * Includes UI broadcast.
 */
class SupplierCreatedModule {
  /**
   * Handle supplier creation side effects
   * @param {Object} supplier - The supplier entity
   * @param {string} user - User performing the action
   */
  async handle(supplier, user = "system") {
    logger.info(`[SupplierCreated] Supplier #${supplier.id} (${supplier.name}) created by ${user}`);

    // 1. Broadcast to UI
    this._broadcastCreated(supplier);
  }

  /**
   * Broadcast supplier created to UI
   * @private
   */
  _broadcastCreated(supplier) {
    UIBroadcaster.supplier("created", {
      id: supplier.id,
      name: supplier.name,
      contactInfo: supplier.contactInfo,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
    });
  }
}

module.exports = SupplierCreatedModule;