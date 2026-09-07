// src/stateServices/customer/modules/status/CustomerPointsChangeModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");
const NotificationSender = require("../../../common/NotificationSender");

/**
 * CustomerPointsChangeModule - Handles side effects when customer points change.
 * Includes UI broadcast and notifications for significant changes.
 */
class CustomerPointsChangeModule {
  /**
   * Handle points balance change side effects
   * @param {number} customerId - Customer ID
   * @param {number} oldBalance - Previous balance
   * @param {number} newBalance - New balance
   * @param {Object} customer - Full customer entity (optional)
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async handle(customerId, oldBalance, newBalance, customer = null, user = "system", queryRunner = null) {
    const diff = newBalance - oldBalance;
    logger.info(`[CustomerPointsChange] Customer #${customerId} points changed: ${oldBalance} → ${newBalance} (diff: ${diff})`);

    // 1. Broadcast to UI
    this._broadcastPointsChange(customerId, oldBalance, newBalance, diff);

    // 2. Send notification for significant change (> 100 points)
    if (Math.abs(diff) > 100) {
      await this._notifyPointsChange(customer, diff, newBalance, user, queryRunner);
    }
  }

  /**
   * Broadcast points change to UI
   * @private
   */
  _broadcastPointsChange(customerId, oldBalance, newBalance, diff) {
    UIBroadcaster.customer("pointsChanged", {
      id: customerId,
      oldBalance,
      newBalance,
      diff,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send notification for significant points change
   * @private
   */
  async _notifyPointsChange(customer, diff, newBalance, user, queryRunner) {
    if (!customer) return;

    await NotificationSender.sendInApp(
      "Loyalty Points Updated",
      `${customer.name} - Points ${diff > 0 ? "increased" : "decreased"} by ${Math.abs(diff)}. New balance: ${newBalance}`,
      "info",
      {
        customerId: customer.id,
        oldBalance: customer.loyaltyPointsBalance - diff,
        newBalance,
        diff,
      },
      user,
      queryRunner
    );
  }
}

module.exports = CustomerPointsChangeModule;