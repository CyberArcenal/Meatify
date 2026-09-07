// src/stateServices/batch/modules/BatchNotificationModule.js
const { logger } = require("../../../utils/logger");
const NotificationSender = require("../../common/NotificationSender");

/**
 * BatchNotificationModule - Handles notifications for batch events.
 * Sends in-app notifications to the admin user.
 */
class BatchNotificationModule {
  /**
   * Send notification for batch depletion
   * @param {Object} batch - The batch entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyDepleted(batch, user = "system", queryRunner = null) {
    const meatName = batch.meat?.name || "Unknown";
    const message = `Batch ${batch.batchCode} (${meatName}) has been fully depleted.`;

    await NotificationSender.sendInApp(
      "Batch Depleted",
      message,
      "warning",
      {
        batchId: batch.id,
        batchCode: batch.batchCode,
        meatId: batch.meatId,
      },
      user,
      queryRunner
    );
  }

  /**
   * Send notification for batch expiry
   * @param {Object} batch - The batch entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyExpired(batch, user = "system", queryRunner = null) {
    const meatName = batch.meat?.name || "Unknown";
    const message = `Batch ${batch.batchCode} (${meatName}) has expired. Please dispose of the product.`;

    await NotificationSender.sendInApp(
      "Batch Expired",
      message,
      "error",
      {
        batchId: batch.id,
        batchCode: batch.batchCode,
        meatId: batch.meatId,
        expiryDate: batch.expiryDate,
      },
      user,
      queryRunner
    );
  }

  /**
   * Send notification for batch expiring soon
   * @param {Object} batch - The batch entity
   * @param {number} daysUntilExpiry - Days until expiry
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyExpiringSoon(batch, daysUntilExpiry, user = "system", queryRunner = null) {
    const meatName = batch.meat?.name || "Unknown";
    const message = `Batch ${batch.batchCode} (${meatName}) will expire in ${daysUntilExpiry} days.`;

    await NotificationSender.sendInApp(
      "Batch Expiring Soon",
      message,
      "warning",
      {
        batchId: batch.id,
        batchCode: batch.batchCode,
        daysUntilExpiry: daysUntilExpiry,
        expiryDate: batch.expiryDate,
      },
      user,
      queryRunner
    );
  }
}

module.exports = BatchNotificationModule;