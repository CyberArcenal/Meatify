// src/stateServices/customer/modules/status/CustomerDeletedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * CustomerDeletedModule - Handles side effects when a customer is soft-deleted.
 */
class CustomerDeletedModule {
  /**
   * Handle customer deletion side effects
   * @param {number} customerId - Customer ID
   * @param {string} customerName - Customer name
   * @param {string} user - User performing the action
   */
  async handle(customerId, customerName, user = "system") {
    logger.info(`[CustomerDeleted] Customer #${customerId} (${customerName}) soft-deleted by ${user}`);

    // Broadcast to UI
    this._broadcastDeleted(customerId, customerName);
  }

  /**
   * Broadcast customer deleted to UI
   * @private
   */
  _broadcastDeleted(customerId, customerName) {
    UIBroadcaster.customer("deleted", {
      id: customerId,
      name: customerName,
      deletedAt: new Date().toISOString(),
    });
  }
}

module.exports = CustomerDeletedModule;