// src/stateServices/category/modules/CategoryStatusModule.js
const { logger } = require("../../../utils/logger");
const UIBroadcaster = require("../../common/UIBroadcaster");

/**
 * CategoryStatusModule - Handles UI broadcasts for category state changes.
 * All methods are focused on broadcasting IPC events to renderer windows.
 */
class CategoryStatusModule {
  /**
   * Broadcast category created event
   * @param {Object} category - The category entity
   */
  broadcastCreated(category) {
    logger.info(`[CategoryStatus] Broadcasting category #${category.id} (${category.name}) created`);

    UIBroadcaster.category("created", {
      id: category.id,
      name: category.name,
      description: category.description,
      isActive: category.isActive,
      createdAt: category.createdAt,
    });
  }

  /**
   * Broadcast category activated event
   * @param {Object} category - The category entity
   */
  broadcastActivated(category) {
    logger.info(`[CategoryStatus] Broadcasting category #${category.id} (${category.name}) activated`);

    UIBroadcaster.category("activated", {
      id: category.id,
      name: category.name,
      activatedAt: new Date().toISOString(),
    });
  }

  /**
   * Broadcast category deactivated event
   * @param {Object} category - The category entity
   * @param {Object} options - Additional options
   * @param {number} options.reassignedCount - Number of meats reassigned
   * @param {number} options.reassignedToCategoryId - Target category ID
   */
  broadcastDeactivated(category, options = {}) {
    const { reassignedCount = 0, reassignedToCategoryId = null } = options;

    logger.info(`[CategoryStatus] Broadcasting category #${category.id} (${category.name}) deactivated`);

    UIBroadcaster.category("deactivated", {
      id: category.id,
      name: category.name,
      reassignedCount,
      reassignedToCategoryId,
      deactivatedAt: new Date().toISOString(),
    });
  }

  /**
   * Broadcast category merged event
   * @param {Object} data - Merge data
   * @param {number} data.sourceCategoryId - Source category ID
   * @param {string} data.sourceCategoryName - Source category name
   * @param {number} data.targetCategoryId - Target category ID
   * @param {string} data.targetCategoryName - Target category name
   * @param {number} data.meatsReassigned - Number of meats reassigned
   */
  broadcastMerged(data) {
    const { sourceCategoryId, sourceCategoryName, targetCategoryId, targetCategoryName, meatsReassigned } = data;

    logger.info(`[CategoryStatus] Broadcasting categories merged: #${sourceCategoryId} → #${targetCategoryId}`);

    UIBroadcaster.category("merged", {
      sourceCategoryId,
      sourceCategoryName,
      targetCategoryId,
      targetCategoryName,
      meatsReassigned,
      mergedAt: new Date().toISOString(),
    });
  }

  /**
   * Broadcast category updated event
   * @param {number} categoryId - The category ID
   * @param {string} categoryName - The category name
   * @param {Object} changes - The changes made
   * @param {Date} updatedAt - The update timestamp
   */
  broadcastUpdated(categoryId, categoryName, changes, updatedAt) {
    logger.info(`[CategoryStatus] Broadcasting category #${categoryId} (${categoryName}) updated`);

    UIBroadcaster.category("updated", {
      id: categoryId,
      name: categoryName,
      changes: changes,
      updatedAt: updatedAt,
    });
  }

  /**
   * Broadcast category deleted event
   * @param {number} categoryId - The category ID
   * @param {string} categoryName - The category name
   */
  broadcastDeleted(categoryId, categoryName) {
    logger.info(`[CategoryStatus] Broadcasting category #${categoryId} (${categoryName}) deleted`);

    UIBroadcaster.category("deleted", {
      id: categoryId,
      name: categoryName,
      deletedAt: new Date().toISOString(),
    });
  }

  /**
   * Broadcast category restored event
   * @param {Object} category - The category entity
   */
  broadcastRestored(category) {
    logger.info(`[CategoryStatus] Broadcasting category #${category.id} (${category.name}) restored`);

    UIBroadcaster.category("restored", {
      id: category.id,
      name: category.name,
      restoredAt: new Date().toISOString(),
    });
  }
}

module.exports = CategoryStatusModule;