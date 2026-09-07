// src/stateServices/sale/modules/SaleNotificationModule.js
const { logger } = require("../../../utils/logger");
const NotificationSender = require("../../common/NotificationSender");
const system = require("../../../utils/system");

/**
 * SaleNotificationModule - Handles notifications for sale events.
 * This includes admin notifications and customer notifications.
 */
class SaleNotificationModule {
  /**
   * Send notification for a large sale (admin + customer)
   * @param {Object} sale - The sale entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyLargeSale(sale, user = "system", queryRunner = null) {
    // Admin notification
    await NotificationSender.sendInApp(
      "Large Sale Alert",
      `Sale #${sale.id} amount: ₱${sale.totalAmount.toFixed(2)}`,
      "sale",
      { saleId: sale.id, amount: sale.totalAmount },
      user,
      queryRunner
    );

    // Customer notification (email)
    if (sale.customer && sale.customer.email) {
      const company = await system.companyName();
      const emailBody =
        `Dear ${sale.customer.name},\n\n` +
        `Thank you for your recent purchase of ₱${sale.totalAmount.toFixed(2)}!\n\n` +
        `We appreciate your business.\n\n` +
        `Best regards,\n${company}`;

      await NotificationSender.sendEmail(
        sale.customer.email,
        `Thank you for your purchase – #${sale.id}`,
        emailBody,
        user,
        queryRunner
      );
    }
  }

  /**
   * Check and notify loyalty milestone
   * @param {Object} customer - The customer entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async checkLoyaltyMilestone(customer, user = "system", queryRunner = null) {
    // Disabled for now - can be enabled later
    return;

    // if (customer.lifetimePointsEarned > 0 && customer.lifetimePointsEarned % 1000 === 0) {
    //   await NotificationSender.sendInApp(
    //     "Loyalty Milestone",
    //     `${customer.name} has earned points! Total: ${customer.lifetimePointsEarned}`,
    //     "success",
    //     { customerId: customer.id, points: customer.loyaltyPointsBalance },
    //     user,
    //     queryRunner
    //   );
    // }
  }

  /**
   * Send notification for a voided sale
   * @param {Object} sale - The sale entity
   * @param {string} reason - Void reason
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyVoided(sale, reason = "", user = "system", queryRunner = null) {
    await NotificationSender.sendInApp(
      "Sale Voided",
      `Sale #${sale.id} was voided. Reason: ${reason || "No reason provided."}`,
      "info",
      { saleId: sale.id, reason },
      user,
      queryRunner
    );
  }
}

module.exports = SaleNotificationModule;