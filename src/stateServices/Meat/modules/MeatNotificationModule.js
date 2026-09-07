// src/stateServices/meat/modules/MeatNotificationModule.js
const { logger } = require("../../../utils/logger");
const NotificationSender = require("../../common/NotificationSender");

/**
 * MeatNotificationModule - Handles notifications for meat events.
 * Sends in-app notifications to the admin user.
 */
class MeatNotificationModule {
  /**
   * Send notification for meat activation
   * @param {Object} meat - The meat entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyActivated(meat, user = "system", queryRunner = null) {
    await NotificationSender.sendInApp(
      "Meat Product Activated",
      `Meat "${meat.name}" (SKU: ${meat.sku}) has been activated.`,
      "info",
      {
        meatId: meat.id,
        meatName: meat.name,
        sku: meat.sku,
      },
      user,
      queryRunner
    );
  }

  /**
   * Send notification for meat deactivation
   * @param {Object} meat - The meat entity
   * @param {number} activeBatchCount - Number of active batches cleared
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyDeactivated(meat, activeBatchCount = 0, user = "system", queryRunner = null) {
    const message = `Meat "${meat.name}" (SKU: ${meat.sku}) has been deactivated.` +
      (activeBatchCount > 0 ? ` ${activeBatchCount} active batch(es) were cleared.` : "");

    await NotificationSender.sendInApp(
      "Meat Product Deactivated",
      message,
      "warning",
      {
        meatId: meat.id,
        meatName: meat.name,
        sku: meat.sku,
        activeBatchCount,
      },
      user,
      queryRunner
    );
  }

  /**
   * Send notification for meat price change
   * @param {Object} meat - The meat entity
   * @param {number} oldPrice - Previous price
   * @param {number} newPrice - New price
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyPriceChange(meat, oldPrice, newPrice, user = "system", queryRunner = null) {
    await NotificationSender.sendInApp(
      "Meat Price Updated",
      `Price for "${meat.name}" (SKU: ${meat.sku}) changed from ₱${oldPrice} to ₱${newPrice} per kg.`,
      "info",
      {
        meatId: meat.id,
        meatName: meat.name,
        oldPrice,
        newPrice,
      },
      user,
      queryRunner
    );
  }
}

module.exports = MeatNotificationModule;