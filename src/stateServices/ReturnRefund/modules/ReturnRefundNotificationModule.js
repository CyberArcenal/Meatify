// src/stateServices/returnRefund/modules/ReturnRefundNotificationModule.js
const { logger } = require("../../../utils/logger");
const NotificationSender = require("../../common/NotificationSender");
const system = require("../../../utils/system");

/**
 * ReturnRefundNotificationModule - Handles notifications for return/refund events.
 * Sends email/SMS to customer and in-app notification to admin.
 */
class ReturnRefundNotificationModule {
  /**
   * Send notification to customer about return status (email + SMS)
   * and in-app notification to admin.
   * @param {Object} returnRefund - The return entity
   * @param {string} action - The action (processed, cancelled)
   * @param {string} user - User performing the action
   * @param {string} reason - Cancellation reason (if applicable)
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notify(returnRefund, action, user = "system", reason = "", queryRunner = null) {
    const customer = returnRefund.customer;
    if (!customer) {
      logger.warn(`[ReturnRefundNotification] No customer for return #${returnRefund.id}, skipping notification`);
      return;
    }

    const canSendEmail = await system.emailEnabled();
    const canSendSms = await system.smsEnabled();
    const company = await system.companyName();

    const subject = action === "processed"
      ? `Return Processed – ${returnRefund.referenceNo}`
      : `Return Cancelled – ${returnRefund.referenceNo}`;

    const itemsList = returnRefund.items
      .map(
        (item) =>
          `${item.meat?.name || "Unknown"} – ${item.weightKg}kg @ ₱${item.unitPrice}`
      )
      .join("\n");

    const textBody = action === "processed"
      ? `Dear ${customer.name},\n\nWe have processed your return (ref. #${returnRefund.referenceNo}).\n\nReturned items:\n${itemsList}\n\nTotal refund amount: ₱${returnRefund.totalAmount.toFixed(2)}\nRefund method: ${returnRefund.refundMethod}\n\nThe amount will be credited according to your selected refund method.\n\nThank you for shopping with us,\n${company}`
      : `Dear ${customer.name},\n\nYour return request (ref. #${returnRefund.referenceNo}) has been cancelled.${reason ? ` Reason: ${reason}` : ""}\n\nIf you have any questions, please contact our support.\n\nRegards,\n${company}`;

    // ─── Email to customer ──────────────────────────────────────────
    if (canSendEmail && customer.email) {
      await NotificationSender.sendEmail(
        customer.email,
        subject,
        textBody.trim(),
        user,
        queryRunner
      );
    }

    // ─── SMS to customer ─────────────────────────────────────────────
    if (canSendSms && customer.phone) {
      const smsMessage = action === "processed"
        ? `Return #${returnRefund.referenceNo} processed. Refund: ₱${returnRefund.totalAmount.toFixed(2)}. Check email for details.`
        : `Return #${returnRefund.referenceNo} cancelled.${reason ? ` Reason: ${reason}` : ""}`;

      await NotificationSender.sendSms(
        customer.phone,
        smsMessage,
        user,
        queryRunner
      );
    }

    // ─── In-app notification for admin ──────────────────────────────
    const adminMessage = `Return #${returnRefund.referenceNo} has been ${action} for ${customer.name}. Amount: ₱${returnRefund.totalAmount.toFixed(2)}`;
    await NotificationSender.sendInApp(
      `Return ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      adminMessage,
      "info",
      {
        returnId: returnRefund.id,
        referenceNo: returnRefund.referenceNo,
        amount: returnRefund.totalAmount,
        action,
      },
      user,
      queryRunner
    );

    // ─── Special admin notification if processed return was cancelled ──
    // This is handled separately in the orchestrator because it needs the wasProcessed flag.
  }

  /**
   * Send notification when a processed return is cancelled (for admin only)
   * @param {Object} returnRefund - The return entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyProcessedCancelled(returnRefund, user = "system", queryRunner = null) {
    await NotificationSender.sendInApp(
      "Return Cancelled (Processed)",
      `Return #${returnRefund.referenceNo} was processed and then cancelled. Stock and loyalty have been reversed.`,
      "warning",
      {
        returnId: returnRefund.id,
        referenceNo: returnRefund.referenceNo,
      },
      user,
      queryRunner
    );
  }
}

module.exports = ReturnRefundNotificationModule;