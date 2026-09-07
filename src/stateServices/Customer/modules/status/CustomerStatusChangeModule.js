// src/stateServices/customer/modules/status/CustomerStatusChangeModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");
const NotificationSender = require("../../../common/NotificationSender");
const system = require("../../../../utils/system");

/**
 * CustomerStatusChangeModule - Handles side effects when customer status changes.
 * Includes UI broadcast, audit logging (handled separately), and notifications.
 */
class CustomerStatusChangeModule {
  /**
   * Handle customer status change side effects
   * @param {number} customerId - Customer ID
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {Object} customer - Full customer entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async handle(customerId, oldStatus, newStatus, customer, user = "system", queryRunner = null) {
    logger.info(`[CustomerStatusChange] Customer #${customerId} status changed: ${oldStatus} → ${newStatus}`);

    // 1. Broadcast to UI
    this._broadcastStatusChange(customerId, oldStatus, newStatus);

    // 2. Send notification if promoted to VIP or Elite
    if ((newStatus === "vip" || newStatus === "elite") && newStatus !== oldStatus) {
      await this._notifyStatusChange(customer, oldStatus, newStatus, user, queryRunner);
    }
  }

  /**
   * Broadcast status change to UI
   * @private
   */
  _broadcastStatusChange(customerId, oldStatus, newStatus) {
    UIBroadcaster.customer("statusChanged", {
      id: customerId,
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send notification when customer status changes
   * @private
   */
  async _notifyStatusChange(customer, oldStatus, newStatus, user, queryRunner) {
    const company = await system.companyName();

    // ─── In-app notification for admin ──────────────────────────
    await NotificationSender.sendInApp(
      "Customer Loyalty Milestone",
      `${customer.name} has reached ${newStatus} status! (was ${oldStatus})`,
      "success",
      {
        customerId: customer.id,
        oldStatus,
        newStatus,
        points: customer.loyaltyPointsBalance,
      },
      user,
      queryRunner
    );

    // ─── Email to customer ──────────────────────────────────────
    const emailBody =
      `Dear ${customer.name},\n\n` +
      `Congratulations! You have reached ${newStatus} status at ${company}.\n\n` +
      `Your current loyalty points: ${customer.loyaltyPointsBalance}\n` +
      `Lifetime points: ${customer.lifetimePointsEarned || 0}\n\n` +
      `We appreciate your continued patronage and look forward to serving you with exclusive benefits.\n\n` +
      `Thank you for being a valued customer!\n\n` +
      `Best regards,\n${company}`;

    await NotificationSender.sendEmail(
      customer.email,
      `Congratulations! You've reached ${newStatus} status!`,
      emailBody,
      user,
      queryRunner
    );

    // ─── SMS to customer ────────────────────────────────────────
    await NotificationSender.sendSms(
      customer.phone,
      `Congratulations! You've reached ${newStatus} status at ${company}. Thank you for your loyalty!`,
      user,
      queryRunner
    );
  }
}

module.exports = CustomerStatusChangeModule;