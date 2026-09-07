// src/stateServices/category/modules/CategoryAuditModule.js
const AuditLogger = require("../../common/AuditLogger");

/**
 * CategoryAuditModule - Handles audit logging for category events.
 * Delegates to the common AuditLogger.
 */
class CategoryAuditModule {
  /**
   * Log category creation
   * @param {number} categoryId - The category ID
   * @param {Object} category - The category entity
   * @param {string} user - User performing the action
   */
  async logCreated(categoryId, category, user = "system") {
    await AuditLogger.logCreate("Category", categoryId, category, user);
  }

  /**
   * Log category activation
   * @param {number} categoryId - The category ID
   * @param {Object} category - The category entity
   * @param {string} user - User performing the action
   */
  async logActivated(categoryId, category, user = "system") {
    await AuditLogger.logUpdate(
      "Category",
      categoryId,
      { action: "activated" },
      { isActive: true },
      user
    );
  }

  /**
   * Log category deactivation
   * @param {number} categoryId - The category ID
   * @param {Object} category - The category entity
   * @param {Object} options - Additional options
   * @param {number} options.reassignedCount - Number of meats reassigned
   * @param {string} user - User performing the action
   */
  async logDeactivated(categoryId, category, options = {}, user = "system") {
    const { reassignedCount = 0 } = options;

    await AuditLogger.logUpdate(
      "Category",
      categoryId,
      { action: "deactivated", reassignedCount },
      { isActive: false },
      user
    );
  }

  /**
   * Log category merge
   * @param {Object} data - Merge data
   * @param {number} data.sourceCategoryId - Source category ID
   * @param {string} data.targetCategoryId - Target category ID
   * @param {number} data.meatsReassigned - Number of meats reassigned
   * @param {string} user - User performing the action
   */
  async logMerged(data, user = "system") {
    const { sourceCategoryId, targetCategoryId, meatsReassigned } = data;

    await AuditLogger.logUpdate(
      "Category",
      sourceCategoryId,
      { action: "merged", targetCategoryId, meatsReassigned },
      { isActive: false },
      user
    );
  }

  /**
   * Log category update (generic)
   * @param {number} categoryId - The category ID
   * @param {Object} changes - The changes made
   * @param {Object} category - The category entity
   * @param {string} user - User performing the action
   */
  async logUpdated(categoryId, changes, category, user = "system") {
    await AuditLogger.logUpdate("Category", categoryId, changes, category, user);
  }

  /**
   * Log category deletion
   * @param {number} categoryId - The category ID
   * @param {Object} category - The category entity
   * @param {string} user - User performing the action
   */
  async logDeleted(categoryId, category, user = "system") {
    await AuditLogger.logDelete("Category", categoryId, category, user);
  }

  /**
   * Log category restore
   * @param {number} categoryId - The category ID
   * @param {Object} category - The category entity
   * @param {string} user - User performing the action
   */
  async logRestored(categoryId, category, user = "system") {
    await AuditLogger.logUpdate(
      "Category",
      categoryId,
      { action: "restored" },
      { isActive: true },
      user
    );
  }
}

module.exports = CategoryAuditModule;