// src/stateServices/customer/modules/status/CustomerRestoredModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * CustomerRestoredModule - Handles side effects when a customer is restored.
 */
class CustomerRestoredModule {
  /**
   * Handle customer restoration side effects
   * @param {Object} customer - Customer entity
   * @param {string} user - User performing the action
   */
  async handle(customer, user = "system") {
    logger.info(`[CustomerRestored] Customer #${customer.id} (${customer.name}) restored by ${user}`);

    // Broadcast to UI
    this._broadcastRestored(customer);
  }

  /**
   * Broadcast customer restored to UI
   * @private
   */
  _broadcastRestored(customer) {
    UIBroadcaster.customer("restored", {
      id: customer.id,
      name: customer.name,
      restoredAt: new Date().toISOString(),
    });
  }
}

module.exports = CustomerRestoredModule;