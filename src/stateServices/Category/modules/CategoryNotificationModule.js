// src/stateServices/category/modules/CategoryNotificationModule.js
const { logger } = require("../../../utils/logger");
const NotificationSender = require("../../common/NotificationSender");

/**
 * CategoryNotificationModule - Handles notifications for category events.
 * Sends in-app notifications to the admin user.
 */
class CategoryNotificationModule {
  /**
   * Send notification for category activation
   * @param {Object} category - The category entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyActivated(category, user = "system", queryRunner = null) {
    await NotificationSender.sendInApp(
      "Category Activated",
      `Category "${category.name}" has been activated.`,
      "info",
      {
        categoryId: category.id,
        categoryName: category.name,
      },
      user,
      queryRunner
    );
  }

  /**
   * Send notification for category deactivation
   * @param {Object} category - The category entity
   * @param {Object} options - Additional options
   * @param {number} options.reassignedCount - Number of meats reassigned
   * @param {number} options.reassignedToCategoryId - Target category ID
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyDeactivated(category, options = {}, user = "system", queryRunner = null) {
    const { reassignedCount = 0, reassignedToCategoryId = null } = options;

    let message = `Category "${category.name}" has been deactivated.`;
    if (reassignedCount > 0) {
      message += ` ${reassignedCount} meat(s) were reassigned.`;
    }

    await NotificationSender.sendInApp(
      "Category Deactivated",
      message,
      "warning",
      {
        categoryId: category.id,
        categoryName: category.name,
        reassignedCount,
        reassignedToCategoryId,
      },
      user,
      queryRunner
    );
  }

  /**
   * Send notification for category merge
   * @param {Object} data - Merge data
   * @param {string} data.sourceCategoryName - Source category name
   * @param {string} data.targetCategoryName - Target category name
   * @param {number} data.meatsReassigned - Number of meats reassigned
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifyMerged(data, user = "system", queryRunner = null) {
    const { sourceCategoryName, targetCategoryName, meatsReassigned } = data;

    const message = `Category "${sourceCategoryName}" has been merged into "${targetCategoryName}". ${meatsReassigned} meat(s) were reassigned.`;

    await NotificationSender.sendInApp(
      "Categories Merged",
      message,
      "info",
      {
        sourceCategoryName,
        targetCategoryName,
        meatsReassigned,
      },
      user,
      queryRunner
    );
  }
}

module.exports = CategoryNotificationModule;