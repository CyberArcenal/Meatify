// src/stateServices/supplier/modules/status/SupplierUpdatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * SupplierUpdatedModule - Handles side effects when a supplier is updated.
 * Includes UI broadcast.
 */
class SupplierUpdatedModule {
  /**
   * Handle supplier update side effects
   * @param {Object} supplier - The supplier entity
   * @param {Object} changes - The changes made
   * @param {string} user - User performing the action
   */
  async handle(supplier, changes, user = "system") {
    logger.info(`[SupplierUpdated] Supplier #${supplier.id} (${supplier.name}) updated (fields: ${Object.keys(changes).join(", ")}) by ${user}`);

    // 1. Broadcast to UI
    this._broadcastUpdated(supplier, changes);
  }

  /**
   * Broadcast supplier updated to UI
   * @private
   */
  _broadcastUpdated(supplier, changes) {
    UIBroadcaster.supplier("updated", {
      id: supplier.id,
      name: supplier.name,
      changes: changes,
      updatedAt: supplier.updatedAt,
    });
  }
}

module.exports = SupplierUpdatedModule;