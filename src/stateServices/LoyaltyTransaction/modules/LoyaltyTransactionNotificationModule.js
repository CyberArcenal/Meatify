// src/stateServices/loyaltyTransaction/modules/LoyaltyTransactionNotificationModule.js
const { logger } = require("../../../utils/logger");
const NotificationSender = require("../../common/NotificationSender");
const system = require("../../../utils/system");

/**
 * LoyaltyTransactionNotificationModule - Handles notifications for loyalty transaction events.
 * Includes in-app, email, and SMS notifications.
 */
class LoyaltyTransactionNotificationModule {
  /**
   * Send notification when customer status changes
   * @param {Object} customer - The customer entity
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyStatusChange(customer, oldStatus, newStatus, user = "system", queryRunner = null) {
    const company = await system.companyName();
    const canSendEmail = await system.emailEnabled();
    const canSendSms = await system.smsEnabled();

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
    if (canSendEmail && customer.email) {
      const subject = `Congratulations! You've reached ${newStatus} status!`;
      const textBody =
        `Dear ${customer.name},\n\n` +
        `Congratulations! You have reached ${newStatus} status at ${company}.\n\n` +
        `Your current loyalty points: ${customer.loyaltyPointsBalance}\n` +
        `Lifetime points: ${customer.lifetimePointsEarned || 0}\n\n` +
        `We appreciate your continued patronage and look forward to serving you with exclusive benefits.\n\n` +
        `Thank you for being a valued customer!\n\n` +
        `Best regards,\n${company}`;

      await NotificationSender.sendEmail(
        customer.email,
        subject,
        textBody.trim(),
        user,
        queryRunner
      );
    }

    // ─── SMS to customer ────────────────────────────────────────
    if (canSendSms && customer.phone) {
      const smsMessage = `Congratulations! You've reached ${newStatus} status at ${company}. Thank you for your loyalty!`;

      await NotificationSender.sendSms(
        customer.phone,
        smsMessage,
        user,
        queryRunner
      );
    }
  }

  /**
   * Send notification for significant transaction (points > 100)
   * @param {Object} customer - The customer entity
   * @param {Object} transaction - The transaction entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifySignificantTransaction(customer, transaction, user = "system", queryRunner = null) {
    const action = transaction.pointsChange > 0 ? "earned" : "redeemed";

    await NotificationSender.sendInApp(
      `Loyalty Points ${action === "earned" ? "Earned" : "Redeemed"}`,
      `${customer?.name || "Customer"} ${action} ${Math.abs(transaction.pointsChange)} points. Type: ${transaction.transactionType}`,
      transaction.pointsChange > 0 ? "success" : "info",
      {
        transactionId: transaction.id,
        customerId: customer?.id,
        pointsChange: transaction.pointsChange,
      },
      user,
      queryRunner
    );
  }
}

module.exports = LoyaltyTransactionNotificationModule;