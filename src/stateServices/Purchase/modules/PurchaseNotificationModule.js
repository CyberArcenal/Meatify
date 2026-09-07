// src/stateServices/purchase/modules/PurchaseNotificationModule.js
const { logger } = require("../../../utils/logger");
const NotificationSender = require("../../common/NotificationSender");
const system = require("../../../utils/system");

/**
 * PurchaseNotificationModule - Handles notifications for purchase events.
 * Sends email to supplier (if enabled) and in-app notification to admin.
 */
class PurchaseNotificationModule {
  /**
   * Notify supplier about purchase status change via email (if enabled)
   * and send in-app notification to admin.
   * @param {Object} purchase - The purchase entity
   * @param {string} action - The action (approved, completed, cancelled)
   * @param {string} user - User performing the action
   * @param {string} reason - Cancellation reason (if applicable)
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notify(purchase, action, user = "system", reason = "", queryRunner = null) {
    if (!purchase.supplier) {
      logger.warn(`[PurchaseNotification] No supplier for purchase #${purchase.id}`);
      return;
    }

    const supplier = purchase.supplier;
    const company = await system.companyName();

    let title, message, type;

    switch (action) {
      case "approved":
        title = "Purchase Order Approved";
        message = `Purchase #${purchase.referenceNo} has been approved. Please prepare the order.`;
        type = "info";
        break;
      case "completed":
        title = "Purchase Order Completed";
        message = `Purchase #${purchase.referenceNo} has been completed. Stock has been added to inventory.`;
        type = "success";
        break;
      case "cancelled":
        title = "Purchase Order Cancelled";
        message = `Purchase #${purchase.referenceNo} has been cancelled.${reason ? ` Reason: ${reason}` : ""}`;
        type = "warning";
        break;
      default:
        return;
    }

    // ─── 1. Send email to supplier (if enabled and email exists) ───
    const emailEnabled = await system.emailEnabled();
    if (emailEnabled && supplier.email) {
      await this._sendSupplierEmail(purchase, supplier, action, message, company, title, user, queryRunner);
    } else {
      const reasonMsg = !emailEnabled ? "email notifications disabled" : "supplier has no email";
      logger.warn(`[PurchaseNotification] Skipping email to supplier (${reasonMsg}) for purchase #${purchase.id}`);
    }

    // ─── 2. In-app notification for the store owner/seller ───
    await this._sendAdminNotification(purchase, supplier, action, message, title, type, emailEnabled, user, queryRunner);
  }

  /**
   * Send email to supplier
   * @private
   */
  async _sendSupplierEmail(purchase, supplier, action, message, company, title, user, queryRunner) {
    const emailSubject = `${title} – ${purchase.referenceNo}`;

    // Build item list with details
    let itemsList = "";
    if (purchase.purchaseItems && purchase.purchaseItems.length > 0) {
      itemsList = purchase.purchaseItems
        .map((item, index) => {
          const meatName = item.meat?.name || "Unknown Item";
          const expiryDate = item.expiryDate
            ? new Date(item.expiryDate).toLocaleDateString()
            : "N/A";
          return `  ${index + 1}. ${meatName}\n     Quantity: ${item.quantity}kg @ ₱${item.unitPrice.toFixed(2)} = ₱${item.subtotal.toFixed(2)}\n     Expiry: ${expiryDate}`;
        })
        .join("\n");
    } else {
      itemsList = "  (No items listed)";
    }

    const emailBody =
      `Dear ${supplier.name},\n\n` +
      `${message}\n\n` +
      `┌─────────────────────────────────────────\n` +
      `│ PURCHASE DETAILS\n` +
      `├─────────────────────────────────────────\n` +
      `│ Reference:  ${purchase.referenceNo}\n` +
      `│ Date:       ${new Date(purchase.orderDate).toLocaleDateString()}\n` +
      `│ Status:     ${purchase.status.toUpperCase()}\n` +
      `│ Total:      ₱${purchase.totalAmount.toFixed(2)}\n` +
      `│ Items:      ${purchase.purchaseItems?.length || 0}\n` +
      `└─────────────────────────────────────────\n\n` +
      `ITEMS:\n${itemsList}\n\n` +
      `Thank you for your business.\n\n` +
      `Regards,\n${company}`;

    await NotificationSender.sendEmail(
      supplier.email,
      emailSubject,
      emailBody.trim(),
      user,
      queryRunner
    );
  }

  /**
   * Send in-app notification to admin
   * @private
   */
  async _sendAdminNotification(purchase, supplier, action, message, title, type, emailEnabled, user, queryRunner) {
    const emailStatus = emailEnabled && supplier.email
      ? `✓ Email sent to ${supplier.email}`
      : "✗ Email not sent";

    await NotificationSender.sendInApp(
      `Purchase ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      `Purchase #${purchase.referenceNo} ${action}.\nSupplier: ${supplier.name}\nAmount: ₱${purchase.totalAmount.toFixed(2)}\n${emailStatus}`,
      type,
      {
        purchaseId: purchase.id,
        referenceNo: purchase.referenceNo,
        supplierId: supplier.id,
        action,
        emailSent: emailEnabled && !!supplier.email,
      },
      user,
      queryRunner
    );
  }
}

module.exports = PurchaseNotificationModule;