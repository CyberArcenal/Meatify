// src/stateServices/customer/modules/status/CustomerCreatedModule.js
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");
const NotificationSender = require("../../../common/NotificationSender");
const system = require("../../../../utils/system");

/**
 * CustomerCreatedModule - Handles side effects when a customer is created.
 * Includes UI broadcast, welcome email, and audit logging (audit is handled separately).
 */
class CustomerCreatedModule {
  /**
   * Handle customer creation side effects
   * @param {Object} customer - The customer entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async handle(customer, user = "system", queryRunner = null) {
    logger.info(`[CustomerCreated] Customer #${customer.id} (${customer.name}) created by ${user}`);

    // 1. Broadcast to UI
    this._broadcastCreated(customer);

    // 2. Send welcome email (if enabled)
    await this._sendWelcomeEmail(customer, user, queryRunner);
  }

  /**
   * Broadcast customer created event to UI
   * @private
   */
  _broadcastCreated(customer) {
    UIBroadcaster.customer("created", {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      status: customer.status,
      loyaltyPoints: customer.loyaltyPointsBalance,
      createdAt: customer.createdAt,
    });
  }

  /**
   * Send welcome email to new customer
   * @private
   */
  async _sendWelcomeEmail(customer, user, queryRunner) {
    const emailEnabled = await system.emailEnabled();
    if (!emailEnabled || !customer.email) {
      const reason = !emailEnabled ? "email notifications disabled" : "customer has no email";
      logger.debug(`[CustomerCreated] Skipping welcome email (${reason}) for customer #${customer.id}`);
      return;
    }

    const company = await system.companyName();
    const subject = `Welcome to ${company}! 🥩`;

    const textBody =
      `Dear ${customer.name},\n\n` +
      `Welcome to ${company}! We're excited to have you as a valued customer.\n\n` +
      `Here's what you can expect:\n` +
      `✅ Quality meat products at competitive prices\n` +
      `✅ Loyalty points on every purchase\n` +
      `✅ Special promotions and discounts\n` +
      `✅ Easy and fast checkout experience\n\n` +
      `Your loyalty points balance: ${customer.loyaltyPointsBalance || 0}\n\n` +
      `We look forward to serving you!\n\n` +
      `Best regards,\n${company} Team`;

    await NotificationSender.sendEmail(
      customer.email,
      subject,
      textBody.trim(),
      user,
      queryRunner
    );
  }
}

module.exports = CustomerCreatedModule;